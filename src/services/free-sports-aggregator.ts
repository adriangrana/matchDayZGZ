import {
  normalizeTeamName,
  resolveGroupTwoTeam,
} from "@/src/data/primera-federacion-teams";
import type { Team } from "@/src/domain/models";
import { AsPrimeraFederacionProvider } from "@/src/providers/as-primera-federacion-provider";
import { ComputedStandingsProvider } from "@/src/providers/computed-standings-provider";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
  OfficialMatchPatch,
  SourceDiagnostic,
} from "@/src/providers/free-sports-types";
import { RealZaragozaOfficialProvider } from "@/src/providers/real-zaragoza-official-provider";
import {
  RfefPdfCalendarProvider,
  RFEF_CALENDAR_URL,
} from "@/src/providers/rfef-pdf-calendar-provider";
import { FreeSportsSnapshotStore } from "@/src/services/free-sports-snapshot-store";
import { ResponsibleHttpClient } from "@/src/services/responsible-http-client";

function genericTeam(name: string): Team {
  const id = normalizeTeamName(name).replace(/\s+/g, "-");
  return {
    id,
    name,
    shortName: name,
    abbreviation: name
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 3)
      .toUpperCase(),
  };
}

function samePair(
  match: NormalizedGroupMatch,
  patch: OfficialMatchPatch,
): boolean {
  const home = resolveGroupTwoTeam(patch.homeTeamName);
  const away = resolveGroupTwoTeam(patch.awayTeamName);
  return Boolean(
    home &&
      away &&
      home.id === match.homeTeam.id &&
      away.id === match.awayTeam.id &&
      (!patch.round || patch.round === match.round),
  );
}

function mergeOfficialPatches(
  calendar: NormalizedGroupMatch[],
  patches: OfficialMatchPatch[],
): NormalizedGroupMatch[] {
  const merged = calendar.map((match) => ({ ...match }));

  for (const patch of patches) {
    const index = merged.findIndex((match) => samePair(match, patch));
    if (index >= 0) {
      const current = merged[index]!;
      merged[index] = {
        ...current,
        startsAt: patch.startsAt ?? current.startsAt,
        kickoffStatus: patch.startsAt
          ? patch.kickoffStatus
          : current.kickoffStatus,
        venue: patch.venue ?? current.venue,
        score: patch.score ?? current.score,
        status: patch.status ?? current.status,
        sources: [patch.source, ...current.sources],
        updatedAt: patch.source.fetchedAt,
      };
      continue;
    }

    const home =
      resolveGroupTwoTeam(patch.homeTeamName) ??
      genericTeam(patch.homeTeamName);
    const away =
      resolveGroupTwoTeam(patch.awayTeamName) ??
      genericTeam(patch.awayTeamName);
    if (home.id !== "real-zaragoza" && away.id !== "real-zaragoza") continue;
    if (!patch.startsAt) continue;
    merged.push({
      id: `real-zaragoza-official-${patch.round ?? "extra"}-${home.id}-${away.id}`,
      round: patch.round ?? 0,
      roundLabel: patch.round ? `Jornada ${patch.round}` : "Amistoso",
      dateBase: patch.startsAt.slice(0, 10),
      startsAt: patch.startsAt,
      kickoffStatus: patch.kickoffStatus,
      homeTeam: home,
      awayTeam: away,
      venue: patch.venue,
      score: patch.score,
      status: patch.status ?? "scheduled",
      sources: [patch.source],
      updatedAt: patch.source.fetchedAt,
    });
  }

  return merged.sort(
    (first, second) =>
      new Date(first.startsAt).getTime() -
      new Date(second.startsAt).getTime(),
  );
}

function unavailableRfefDiagnostic(
  now: Date,
  error: unknown,
): SourceDiagnostic {
  return {
    id: "rfef-calendar-pdf",
    name: "Calendario oficial RFEF",
    url: RFEF_CALENDAR_URL,
    policyStatus: "unavailable",
    cache: "miss",
    extracted: { matches: 0, standings: 0 },
    placeholderKickoffsDiscarded: 0,
    checkedAt: now.toISOString(),
    error: error instanceof Error ? error.message : "Error desconocido",
  };
}

function completeRoundResults(matches: NormalizedGroupMatch[]): {
  matches: NormalizedGroupMatch[];
  differences: string[];
} {
  const complete: NormalizedGroupMatch[] = [];
  const differences: string[] = [];
  for (let round = 1; round <= 38; round += 1) {
    const roundMatches = matches.filter(
      (match) =>
        match.round === round &&
        match.sources.some((source) => source.id === "rfef-calendar-pdf"),
    );
    const finished = roundMatches.filter(
      (match) => match.status === "finished" && match.score,
    );
    if (finished.length === 0) continue;
    if (finished.length !== 10) {
      differences.push(
        `Jornada ${round}: ${finished.length}/10 resultados; se excluye del cálculo hasta completarse`,
      );
      continue;
    }
    complete.push(...finished);
  }
  return { matches: complete, differences };
}

export class FreeSportsAggregator {
  private readonly http: ResponsibleHttpClient;
  private readonly store: FreeSportsSnapshotStore;

  constructor(
    private readonly fallbackMatches: NormalizedGroupMatch[],
    options: {
      http?: ResponsibleHttpClient;
      store?: FreeSportsSnapshotStore;
    } = {},
  ) {
    this.http = options.http ?? new ResponsibleHttpClient();
    this.store = options.store ?? new FreeSportsSnapshotStore();
  }

  async sync(options: {
    now?: Date;
    force?: boolean;
  } = {}): Promise<FreeSportsInspection> {
    const now = options.now ?? new Date();
    const diagnostics: SourceDiagnostic[] = [];
    const previous = await this.store.read();
    let calendar: NormalizedGroupMatch[] | undefined;

    try {
      const rfef = await new RfefPdfCalendarProvider(
        this.http,
      ).getCalendar(options);
      calendar = rfef.matches;
      diagnostics.push(rfef.diagnostic);
    } catch (error) {
      diagnostics.push(unavailableRfefDiagnostic(now, error));
      const previousCalendar = previous?.matches.filter((match) =>
        match.sources.some((source) => source.id === "rfef-calendar-pdf"),
      );
      calendar =
        previousCalendar?.length === 380
          ? previousCalendar
          : this.fallbackMatches;
    }

    const asResult = new AsPrimeraFederacionProvider().inspect(now);
    diagnostics.push(asResult.diagnostic);

    const official = await new RealZaragozaOfficialProvider(
      this.http,
    ).getOfficialData(options);
    diagnostics.push(...official.diagnostics);

    const matches = mergeOfficialPatches(calendar, official.patches);
    const computed = new ComputedStandingsProvider();
    const completeResults = completeRoundResults(matches);
    const standings = computed.compute(completeResults.matches);
    const publishedStandings = undefined;
    const differences = [
      ...completeResults.differences,
      ...computed.compare(standings, publishedStandings),
    ];
    const zaragozaMatches = matches.filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    );
    const snapshot: FreeSportsInspection = {
      provider: "free-web",
      syncedAt: now.toISOString(),
      requestCount: this.http.requestCount,
      diagnostics,
      matches,
      zaragozaMatches,
      standings,
      publishedStandings,
      differences,
      reviewRequired:
        differences.length > 0 ||
        diagnostics.some(
          (diagnostic) =>
            diagnostic.policyStatus === "unavailable" &&
            diagnostic.id === "rfef-calendar-pdf",
        ),
    };
    await this.store.write(snapshot);
    return snapshot;
  }

  async inspect(): Promise<FreeSportsInspection | undefined> {
    return this.store.read();
  }
}
