import type {
  DailyRequestUsage,
  Match,
  SportsDashboardSnapshot,
  StandingEntry,
} from "@/src/domain/models";
import {
  ApiFootballClient,
  ApiFootballProvider,
} from "@/src/providers/api-football-provider";
import { DemoMatchDayProvider } from "@/src/providers/demo-match-day-provider";
import { getFreeSportsDashboardSnapshot } from "@/src/services/free-sports-dashboard";
import {
  SportsRequestLimitError,
  SportsStateStore,
  type PersistedSportsState,
  type SportsProviderMetadata,
} from "@/src/services/sports-state-store";

declare global {
  var __matchDaySportsSync:
    | Promise<SportsDashboardSnapshot>
    | undefined;
}

function positiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalId(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function dailyLimit(): number {
  return Math.min(
    50,
    Math.floor(positiveNumber(process.env.API_FOOTBALL_DAILY_LIMIT, 50)),
  );
}

function cacheHours() {
  return {
    fixtures: positiveNumber(process.env.SPORTS_FIXTURES_CACHE_HOURS, 6),
    standings: positiveNumber(process.env.SPORTS_STANDINGS_CACHE_HOURS, 12),
    metadata: positiveNumber(process.env.SPORTS_METADATA_CACHE_HOURS, 24),
  };
}

function isDue(
  syncedAt: string | undefined,
  hours: number,
  now: Date,
): boolean {
  if (!syncedAt) return true;
  const timestamp = new Date(syncedAt).getTime();
  return (
    Number.isNaN(timestamp) ||
    now.getTime() - timestamp >= hours * 3_600_000
  );
}

function homeStandings(entries: StandingEntry[]): StandingEntry[] {
  if (entries.length <= 5) return entries;
  const zaragozaIndex = entries.findIndex(
    (entry) => entry.team.id === "real-zaragoza",
  );
  if (zaragozaIndex < 0) return entries.slice(0, 5);
  const start = Math.max(0, Math.min(zaragozaIndex - 2, entries.length - 5));
  return entries.slice(start, start + 5);
}

function selectMatches(matches: Match[], now: Date) {
  const nowTime = now.getTime();
  const recentMatches = matches
    .filter((match) => match.status === "finished")
    .sort(
      (first, second) =>
        new Date(second.startsAt).getTime() -
        new Date(first.startsAt).getTime(),
    )
    .slice(0, 3);
  const upcomingMatches = matches
    .filter(
      (match) =>
        match.status !== "finished" &&
        new Date(match.startsAt).getTime() >= nowTime - 3_600_000,
    )
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() -
        new Date(second.startsAt).getTime(),
    )
    .slice(0, 3);
  return { recentMatches, upcomingMatches };
}

async function demoSportsSnapshot(
  store: SportsStateStore,
  errors: string[] = [],
): Promise<SportsDashboardSnapshot> {
  const snapshot = await new DemoMatchDayProvider().getSnapshot();
  return {
    ...snapshot,
    mode: "demo",
    stale: errors.length > 0,
    sourceErrors: errors,
    requestUsage: await store.getUsage(dailyLimit()),
    syncTimes: {},
    standingsStatus: snapshot.recentMatches.some(
      (match) => match.status === "finished",
    )
      ? "partial"
      : "preseason",
    missingGroupResults: 380,
    groupOneUpcomingMatches: [],
    groupOneRecentMatches: [],
    groupOneStandings: [],
    groupOneStandingsStatus: "preseason",
    groupOneMissingGroupResults: 380,
    groupOneGeneratedAt: snapshot.generatedAt,
    groupTwoUpcomingMatches: snapshot.upcomingMatches,
    groupTwoRecentMatches: snapshot.recentMatches,
    groupTwoFullStandings: snapshot.standings,
    groupTwoStandingsStatus: "preseason",
    groupTwoMissingGroupResults: 380,
  };
}

function realDashboardSnapshot(
  state: PersistedSportsState,
  usage: DailyRequestUsage,
  errors: string[],
  now: Date,
): SportsDashboardSnapshot | undefined {
  if (!state.matches?.length || !state.standings?.length) return undefined;
  const { recentMatches, upcomingMatches } = selectMatches(state.matches, now);
  const nextMatch = upcomingMatches[0];
  if (!nextMatch) return undefined;
  const dataSyncedAt = [
    state.syncTimes.fixtures,
    state.syncTimes.standings,
  ]
    .filter((value): value is string => Boolean(value))
    .sort(
      (first, second) =>
        new Date(second).getTime() - new Date(first).getTime(),
    )[0];

  return {
    nextMatch,
    recentMatches,
    upcomingMatches,
    standings: homeStandings(state.standings),
    news: [],
    dailyBrief:
      "Calendario, resultados recientes y clasificación obtenidos desde el proveedor deportivo configurado. El prototipo no realiza seguimiento en directo.",
    generatedAt: dataSyncedAt ?? now.toISOString(),
    freshness: errors.length > 0 ? "stale" : "fresh",
    isDemo: false,
    mode: "real",
    stale: errors.length > 0,
    sourceErrors: errors,
    requestUsage: usage,
    syncTimes: state.syncTimes,
    standingsStatus: state.matches.every(
      (match) => match.status === "finished" && match.score,
    )
      ? "complete"
      : state.matches.some(
            (match) => match.status === "finished" && match.score,
          )
        ? "partial"
        : "preseason",
    missingGroupResults: Math.max(
      0,
      380 -
        state.matches.filter(
          (match) => match.status === "finished" && match.score,
        ).length,
    ),
    groupOneUpcomingMatches: [],
    groupOneRecentMatches: [],
    groupOneStandings: [],
    groupOneStandingsStatus: "unavailable",
    groupOneMissingGroupResults: 380,
    groupOneGeneratedAt: dataSyncedAt ?? now.toISOString(),
    groupTwoUpcomingMatches: upcomingMatches,
    groupTwoRecentMatches: recentMatches,
    groupTwoFullStandings: state.standings,
    groupTwoStandingsStatus: state.matches.some(
      (match) => match.status === "finished" && match.score,
    )
      ? "partial"
      : "preseason",
    groupTwoMissingGroupResults: Math.max(
      0,
      380 -
        state.matches.filter(
          (match) => match.status === "finished" && match.score,
        ).length,
    ),
  };
}

async function synchronizeSports(
  force: boolean,
  now: Date,
): Promise<SportsDashboardSnapshot> {
  const store = new SportsStateStore();
  const selectedProvider = process.env.SPORTS_PROVIDER?.trim() || "free-web";
  if (selectedProvider === "free-web") {
    const snapshot = await getFreeSportsDashboardSnapshot(now);
    return (
      snapshot ??
      (await demoSportsSnapshot(store, [
        "El calendario gratuito no contiene un próximo partido válido",
      ]))
    );
  }
  if (selectedProvider !== "api-football") {
    return demoSportsSnapshot(store);
  }

  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (!apiKey) {
    return demoSportsSnapshot(store, [
      "API_FOOTBALL_KEY no está configurada; se conserva el modo demo",
    ]);
  }

  const limit = dailyLimit();
  const client = new ApiFootballClient({
    apiKey,
    baseUrl: process.env.API_FOOTBALL_BASE_URL,
    dailyLimit: limit,
    stateStore: store,
  });
  const season = Math.floor(
    positiveNumber(process.env.API_FOOTBALL_SEASON, 2024),
  );
  const provider = new ApiFootballProvider(client, {
    season,
    teamId: optionalId(process.env.API_FOOTBALL_TEAM_ID),
    leagueId: optionalId(process.env.API_FOOTBALL_LEAGUE_ID),
    teamName: "Real Zaragoza",
    leagueName: process.env.API_FOOTBALL_LEAGUE_NAME?.trim() || undefined,
  });
  const state = await store.read();
  if (!store.isPersistent()) {
    return demoSportsSnapshot(store, [
      "La web local usa un runtime sin escritura de archivos; prueba el adaptador opcional desde su script local para no exponer la clave",
    ]);
  }
  const durations = cacheHours();
  const errors: string[] = [];
  let metadata: SportsProviderMetadata | undefined = state.metadata;
  let matches = state.matches;
  let standings = state.standings;
  const syncTimes = { ...state.syncTimes };
  let didUpdate = false;

  const metadataDue =
    force || isDue(syncTimes.metadata, durations.metadata, now);
  if (metadataDue || !metadata) {
    try {
      metadata = await provider.resolveMetadata(
        { now, force: metadataDue },
        metadata,
      );
      syncTimes.metadata = now.toISOString();
      didUpdate = true;
      console.info(
        `[sports-sync] metadatos validados: equipo ${metadata.teamId}, competición ${metadata.leagueId}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "error desconocido";
      errors.push(`metadata: ${message}`);
      console.warn(`[sports-sync] metadata: ${message}`);
    }
  }

  if (metadata) {
    const fixturesDue =
      force || isDue(syncTimes.fixtures, durations.fixtures, now);
    if (fixturesDue || !matches?.length) {
      try {
        matches = await provider.getMatchesFor(metadata, { now });
        syncTimes.fixtures = now.toISOString();
        didUpdate = true;
        console.info(
          `[sports-sync] calendario: ${matches.length} partidos normalizados`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "error desconocido";
        errors.push(`fixtures: ${message}`);
        console.warn(`[sports-sync] fixtures: ${message}`);
      }
    }

    const standingsDue =
      force || isDue(syncTimes.standings, durations.standings, now);
    if (standingsDue || !standings?.length) {
      try {
        standings = await provider.getStandingsFor(metadata, { now });
        syncTimes.standings = now.toISOString();
        didUpdate = true;
        console.info(
          `[sports-sync] clasificación: ${standings.length} equipos normalizados`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "error desconocido";
        errors.push(`standings: ${message}`);
        console.warn(`[sports-sync] standings: ${message}`);
      }
    }
  }

  const latestState = await store.read();
  const updatedState: PersistedSportsState = {
    ...latestState,
    metadata: metadata ?? latestState.metadata,
    matches: matches ?? latestState.matches,
    standings: standings ?? latestState.standings,
    syncTimes,
    syncedAt: didUpdate ? now.toISOString() : state.syncedAt,
  };
  await store.write(updatedState);
  const usage = await store.getUsage(limit, now);
  const realSnapshot = realDashboardSnapshot(
    updatedState,
    usage,
    errors,
    now,
  );
  if (realSnapshot) return realSnapshot;

  const fallbackReason =
    errors.length > 0
      ? errors
      : [
          `API-Football sincronizó la temporada histórica ${metadata?.season ?? season}, pero no contiene próximos partidos; se conserva el modo demo en la portada`,
        ];
  return demoSportsSnapshot(store, fallbackReason);
}

export async function getSportsSnapshot(options: {
  force?: boolean;
  now?: Date;
} = {}): Promise<SportsDashboardSnapshot> {
  const now = options.now ?? new Date();
  if (globalThis.__matchDaySportsSync) {
    return globalThis.__matchDaySportsSync;
  }

  const operation = synchronizeSports(options.force ?? false, now).finally(
    () => {
      globalThis.__matchDaySportsSync = undefined;
    },
  );
  globalThis.__matchDaySportsSync = operation;
  return operation;
}

export async function forceSportsSync(): Promise<SportsDashboardSnapshot> {
  return getSportsSnapshot({ force: true });
}

export function isSportsRequestLimitError(
  error: unknown,
): error is SportsRequestLimitError {
  return error instanceof SportsRequestLimitError;
}
