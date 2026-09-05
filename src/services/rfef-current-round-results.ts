import { groupOneTeams } from "@/src/data/primera-federacion-teams";
import type { SourceReference } from "@/src/domain/models";
import { ComputedStandingsProvider } from "@/src/providers/computed-standings-provider";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
  SourceDiagnostic,
} from "@/src/providers/free-sports-types";
import { parseRfefResultsHtml } from "@/src/providers/rfef-live-results-provider";
import { mergeRfefResultPatches } from "@/src/services/free-sports-aggregator";
import {
  ResponsibleHttpClient,
  responseText,
} from "@/src/services/responsible-http-client";

const ARTICLE_MAX_AGE_MS = 2 * 60 * 1_000;
const ROUND_LOOKAHEAD_MS = 4 * 60 * 60 * 1_000;

export function rfefResultsArticleUrl(round: number): string {
  return `https://rfef.es/es/noticias/resumenes-vive-la-jornada-${round}-de-primera-federacion`;
}

export function currentStartedRound(
  matches: NormalizedGroupMatch[],
  now = new Date(),
): number | undefined {
  const threshold = now.getTime() + ROUND_LOOKAHEAD_MS;
  const rounds = matches
    .filter((match) => {
      if (match.round <= 0) return false;
      const startsAt = new Date(match.startsAt).getTime();
      return Number.isFinite(startsAt) && startsAt <= threshold;
    })
    .map((match) => match.round);
  return rounds.length > 0 ? Math.max(...rounds) : undefined;
}

function articleDiagnostic(
  round: number,
  url: string,
  checkedAt: string,
  extracted: number,
  options: {
    httpStatus?: number;
    cache?: SourceDiagnostic["cache"];
    error?: string;
  } = {},
): SourceDiagnostic {
  return {
    id: `rfef-results-article-r${round}`,
    name: `RFEF · resultados Jornada ${round}`,
    url,
    policyStatus: options.error ? "unavailable" : "allowed",
    httpStatus: options.httpStatus,
    cache: options.cache ?? "disabled",
    extracted: { matches: extracted, standings: 0 },
    placeholderKickoffsDiscarded: 0,
    checkedAt,
    error: options.error,
  };
}

export async function applyRfefCurrentRoundResults(
  snapshot: FreeSportsInspection,
  options: { now?: Date; force?: boolean } = {},
): Promise<FreeSportsInspection> {
  const now = options.now ?? new Date();
  const allMatches = [...snapshot.matches, ...(snapshot.groupOneMatches ?? [])];
  const round = currentStartedRound(allMatches, now);
  if (!round) return snapshot;

  const url = rfefResultsArticleUrl(round);
  const http = new ResponsibleHttpClient();
  const roundMatches = allMatches.filter((match) => match.round === round);

  try {
    const article = await http.get(url, {
      maxAgeMs: ARTICLE_MAX_AGE_MS,
      accept: "text/html,application/xhtml+xml",
      timeoutMs: 10_000,
      retries: 1,
      now,
      force: options.force,
    });
    const source: SourceReference = {
      id: `rfef-results-article-r${round}`,
      name: `RFEF · resultados Jornada ${round}`,
      url,
      fetchedAt: article.fetchedAt,
      isOfficial: true,
    };
    const patches = parseRfefResultsHtml(
      responseText(article),
      roundMatches,
      source,
      { now, finalOnly: true },
    );

    const matches = mergeRfefResultPatches(snapshot.matches, patches);
    const groupOneMatches = mergeRfefResultPatches(
      snapshot.groupOneMatches ?? [],
      patches,
    );
    const standings = new ComputedStandingsProvider().compute(
      matches.filter((match) => match.status === "finished" && match.score),
    );
    const groupOneStandings = new ComputedStandingsProvider(groupOneTeams).compute(
      groupOneMatches.filter(
        (match) => match.status === "finished" && match.score,
      ),
    );

    return {
      ...snapshot,
      requestCount: snapshot.requestCount + http.requestCount,
      diagnostics: [
        ...snapshot.diagnostics.filter(
          (diagnostic) => diagnostic.id !== `rfef-results-article-r${round}`,
        ),
        articleDiagnostic(round, url, article.checkedAt, patches.length, {
          httpStatus: article.status,
          cache: article.cache,
        }),
      ],
      matches,
      groupOneMatches,
      zaragozaMatches: matches.filter(
        (match) =>
          match.homeTeam.id === "real-zaragoza" ||
          match.awayTeam.id === "real-zaragoza",
      ),
      standings,
      groupOneStandings,
    };
  } catch (error) {
    return {
      ...snapshot,
      requestCount: snapshot.requestCount + http.requestCount,
      diagnostics: [
        ...snapshot.diagnostics.filter(
          (diagnostic) => diagnostic.id !== `rfef-results-article-r${round}`,
        ),
        articleDiagnostic(round, url, now.toISOString(), 0, {
          error:
            error instanceof Error
              ? error.message
              : `No se pudieron consultar los resultados de la Jornada ${round}`,
        }),
      ],
    };
  }
}
