import {
  groupOneTeams,
  resolveGroupOneTeam,
  resolveGroupTwoTeam,
} from "@/src/data/primera-federacion-teams";
import type { SourceReference } from "@/src/domain/models";
import { ComputedStandingsProvider } from "@/src/providers/computed-standings-provider";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
  SourceDiagnostic,
} from "@/src/providers/free-sports-types";

const SOFASCORE_BASE = "https://api.sofascore.com/api/v1";
const LIVE_GRACE_MS = 2 * 60 * 1_000;
const LIVE_WINDOW_MS = 150 * 60 * 1_000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152 Safari/537.36";

interface SofascoreTeam {
  name?: string;
  shortName?: string;
}

interface SofascoreScore {
  current?: number;
  display?: number;
  normaltime?: number;
}

interface SofascoreEvent {
  status?: { type?: string; description?: string };
  homeTeam?: SofascoreTeam;
  awayTeam?: SofascoreTeam;
  homeScore?: SofascoreScore;
  awayScore?: SofascoreScore;
  startTimestamp?: number;
}

interface SofascorePayload {
  events?: SofascoreEvent[];
}

function madridDateKey(value: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Europe/Madrid",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function numericScore(score: SofascoreScore | undefined): number | undefined {
  const value = score?.current ?? score?.display ?? score?.normaltime;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resetFalseRoundOneArticleMatch(
  match: NormalizedGroupMatch,
): NormalizedGroupMatch {
  const fromRoundOneArticle = match.sources.some(
    (source) => source.id === "rfef-results-article",
  );
  if (!fromRoundOneArticle || match.round === 1 || match.status !== "finished") {
    return match;
  }

  const sources = match.sources.filter(
    (source) => source.id !== "rfef-results-article",
  );
  return {
    ...match,
    score: undefined,
    status: "scheduled",
    kickoffStatus: "unknown",
    sources,
    updatedAt: sources[0]?.fetchedAt ?? match.updatedAt,
  };
}

export function sanitizeRoundOneArticleResults(
  matches: NormalizedGroupMatch[],
): NormalizedGroupMatch[] {
  return matches.map(resetFalseRoundOneArticleMatch);
}

function findMatchForEvent(
  event: SofascoreEvent,
  matches: NormalizedGroupMatch[],
): NormalizedGroupMatch | undefined {
  const homeName = event.homeTeam?.name ?? event.homeTeam?.shortName;
  const awayName = event.awayTeam?.name ?? event.awayTeam?.shortName;
  if (!homeName || !awayName) return undefined;

  const groupTwoHome = resolveGroupTwoTeam(homeName);
  const groupTwoAway = resolveGroupTwoTeam(awayName);
  if (groupTwoHome && groupTwoAway) {
    const match = matches.find(
      (candidate) =>
        candidate.homeTeam.id === groupTwoHome.id &&
        candidate.awayTeam.id === groupTwoAway.id,
    );
    if (match) return match;
  }

  const groupOneHome = resolveGroupOneTeam(homeName);
  const groupOneAway = resolveGroupOneTeam(awayName);
  if (groupOneHome && groupOneAway) {
    return matches.find(
      (candidate) =>
        candidate.homeTeam.id === groupOneHome.id &&
        candidate.awayTeam.id === groupOneAway.id,
    );
  }

  return undefined;
}

function overlayEvents(
  matches: NormalizedGroupMatch[],
  events: SofascoreEvent[],
  source: SourceReference,
  now: Date,
): { matches: NormalizedGroupMatch[]; extracted: number } {
  const byId = new Map(matches.map((match) => [match.id, match]));
  let extracted = 0;

  for (const event of events) {
    const current = findMatchForEvent(event, [...byId.values()]);
    if (!current) continue;

    const type = event.status?.type?.toLowerCase();
    const home = numericScore(event.homeScore);
    const away = numericScore(event.awayScore);
    const score =
      home !== undefined && away !== undefined ? { home, away } : undefined;

    let status: NormalizedGroupMatch["status"] | undefined;
    if (type === "inprogress") status = "live";
    else if (type === "finished") status = "finished";
    else if (type === "postponed" || type === "canceled" || type === "cancelled") {
      status = "postponed";
    } else if (score && current.kickoffStatus === "confirmed") {
      const startsAt = new Date(current.startsAt).getTime();
      const elapsed = now.getTime() - startsAt;
      if (elapsed >= LIVE_GRACE_MS && elapsed <= LIVE_WINDOW_MS) {
        status = "live";
      }
    }

    if (!status) continue;
    if ((status === "live" || status === "finished") && !score) continue;

    byId.set(current.id, {
      ...current,
      startsAt:
        current.kickoffStatus === "confirmed"
          ? current.startsAt
          : typeof event.startTimestamp === "number"
            ? new Date(event.startTimestamp * 1_000).toISOString()
            : current.startsAt,
      kickoffStatus: "confirmed",
      status,
      score: score ?? current.score,
      sources: [source, ...current.sources.filter((item) => item.id !== source.id)],
      updatedAt: source.fetchedAt,
    });
    extracted += 1;
  }

  return { matches: [...byId.values()], extracted };
}

export function inferMatchesInLiveWindow(
  matches: NormalizedGroupMatch[],
  now: Date,
): NormalizedGroupMatch[] {
  return matches.map((match) => {
    if (match.status !== "scheduled" || match.kickoffStatus !== "confirmed") {
      return match;
    }
    const startsAt = new Date(match.startsAt).getTime();
    if (!Number.isFinite(startsAt)) return match;
    const elapsed = now.getTime() - startsAt;
    if (elapsed < LIVE_GRACE_MS || elapsed > LIVE_WINDOW_MS) return match;
    return { ...match, status: "live" };
  });
}

async function fetchMatchdayEvents(now: Date): Promise<{
  events: SofascoreEvent[];
  diagnostic: SourceDiagnostic;
  requests: number;
}> {
  const date = madridDateKey(now);
  const url = `${SOFASCORE_BASE}/sport/football/scheduled-events/${date}`;
  const checkedAt = now.toISOString();

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json,text/plain,*/*",
        origin: "https://www.sofascore.com",
        referer: "https://www.sofascore.com/",
        "user-agent": BROWSER_USER_AGENT,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new Error(`Sofascore jornada devolvió HTTP ${response.status}`);
    }
    const payload = (await response.json()) as SofascorePayload;
    if (!Array.isArray(payload.events)) {
      throw new Error("Sofascore jornada devolvió una respuesta sin events");
    }
    return {
      events: payload.events,
      requests: 1,
      diagnostic: {
        id: "sofascore-matchday-fallback",
        name: "Sofascore · jornada en curso",
        url,
        policyStatus: "allowed",
        httpStatus: response.status,
        cache: "disabled",
        extracted: { matches: 0, standings: 0 },
        placeholderKickoffsDiscarded: 0,
        checkedAt,
      },
    };
  } catch (error) {
    return {
      events: [],
      requests: 1,
      diagnostic: {
        id: "sofascore-matchday-fallback",
        name: "Sofascore · jornada en curso",
        url,
        policyStatus: "unavailable",
        cache: "disabled",
        extracted: { matches: 0, standings: 0 },
        placeholderKickoffsDiscarded: 0,
        checkedAt,
        error:
          error instanceof Error ? error.message : "Error del respaldo de jornada",
      },
    };
  }
}

export async function applyLiveScoreOverlay(
  snapshot: FreeSportsInspection,
  options: { now?: Date } = {},
): Promise<FreeSportsInspection> {
  const now = options.now ?? new Date();
  const fetched = await fetchMatchdayEvents(now);
  const source: SourceReference = {
    id: "sofascore-matchday-fallback",
    name: "Sofascore · jornada en curso",
    url: fetched.diagnostic.url,
    fetchedAt: fetched.diagnostic.checkedAt,
  };

  const groupTwoClean = sanitizeRoundOneArticleResults(snapshot.matches);
  const groupOneClean = sanitizeRoundOneArticleResults(snapshot.groupOneMatches ?? []);
  const allClean = [...groupTwoClean, ...groupOneClean];
  const overlay = overlayEvents(allClean, fetched.events, source, now);
  const overlayById = new Map(overlay.matches.map((match) => [match.id, match]));

  const groupTwo = inferMatchesInLiveWindow(
    groupTwoClean.map((match) => overlayById.get(match.id) ?? match),
    now,
  );
  const groupOne = inferMatchesInLiveWindow(
    groupOneClean.map((match) => overlayById.get(match.id) ?? match),
    now,
  );

  const diagnostic = {
    ...fetched.diagnostic,
    extracted: { matches: overlay.extracted, standings: 0 },
  };
  const standings = new ComputedStandingsProvider().compute(
    groupTwo.filter((match) => match.status === "finished" && match.score),
  );
  const groupOneStandings = new ComputedStandingsProvider(groupOneTeams).compute(
    groupOne.filter((match) => match.status === "finished" && match.score),
  );

  return {
    ...snapshot,
    requestCount: snapshot.requestCount + fetched.requests,
    diagnostics: [
      ...snapshot.diagnostics.filter(
        (item) => item.id !== "sofascore-matchday-fallback",
      ),
      diagnostic,
    ],
    matches: groupTwo,
    groupOneMatches: groupOne,
    zaragozaMatches: groupTwo.filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    ),
    standings,
    groupOneStandings,
  };
}
