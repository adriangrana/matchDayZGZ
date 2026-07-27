import { z } from "zod";
import type {
  Match,
  MatchStatus,
  SourceReference,
  StandingEntry,
  Team,
} from "@/src/domain/models";
import type {
  ProviderContext,
  SportsProvider,
} from "@/src/providers/match-day-provider";
import { fetchWithRetry } from "@/src/services/fetch-with-retry";
import {
  SportsStateStore,
  type SportsProviderMetadata,
} from "@/src/services/sports-state-store";

const teamSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});

const teamsResponseSchema = z.array(
  z.object({
    team: teamSchema,
  }),
);

const leaguesResponseSchema = z.array(
  z.object({
    league: z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
      type: z.string().optional(),
    }),
    seasons: z
      .array(
        z.object({
          year: z.number().int(),
          current: z.boolean().optional(),
        }),
      )
      .default([]),
  }),
);

const fixtureSchema = z.object({
  fixture: z.object({
    id: z.number().int().positive(),
    date: z.iso.datetime({ offset: true }),
    timestamp: z.number().int(),
    venue: z
      .object({
        name: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    status: z.object({
      short: z.string().min(1),
    }),
  }),
  league: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    season: z.number().int(),
    round: z.string().nullable().optional(),
  }),
  teams: z.object({
    home: teamSchema,
    away: teamSchema,
  }),
  goals: z.object({
    home: z.number().int().nullable(),
    away: z.number().int().nullable(),
  }),
});

const fixturesResponseSchema = z.array(fixtureSchema);

const standingSchema = z.object({
  rank: z.number().int().positive(),
  team: teamSchema,
  points: z.number().int(),
  goalsDiff: z.number().int(),
  all: z.object({
    played: z.number().int().nonnegative(),
    win: z.number().int().nonnegative(),
    draw: z.number().int().nonnegative(),
    lose: z.number().int().nonnegative(),
  }),
});

const standingsResponseSchema = z.array(
  z.object({
    league: z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
      season: z.number().int(),
      standings: z.array(z.array(standingSchema)),
    }),
  }),
);

const apiEnvelopeSchema = z.object({
  errors: z.union([
    z.array(z.unknown()),
    z.record(z.string(), z.unknown()),
  ]),
  response: z.unknown(),
});

function hasApiErrors(
  errors: unknown[] | Record<string, unknown>,
): boolean {
  return Array.isArray(errors)
    ? errors.length > 0
    : Object.keys(errors).length > 0;
}

function apiErrorMessage(
  errors: unknown[] | Record<string, unknown>,
): string {
  if (Array.isArray(errors)) return JSON.stringify(errors);
  return Object.entries(errors)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("; ");
}

function safeDailyLimit(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(50, Math.floor(value)));
}

export interface ApiFootballClientOptions {
  apiKey: string;
  baseUrl?: string;
  dailyLimit?: number;
  stateStore?: SportsStateStore;
}

export interface ApiFootballTransport {
  get(
    endpoint: string,
    parameters: Record<string, string | number>,
    context?: ProviderContext,
  ): Promise<unknown>;
}

export class ApiFootballClient implements ApiFootballTransport {
  readonly dailyLimit: number;
  readonly stateStore: SportsStateStore;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: ApiFootballClientOptions) {
    if (!options.apiKey.trim()) {
      throw new Error("API_FOOTBALL_KEY no está configurada");
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (
      options.baseUrl ?? "https://v3.football.api-sports.io"
    ).replace(/\/+$/, "");
    this.dailyLimit = safeDailyLimit(options.dailyLimit ?? 50);
    this.stateStore = options.stateStore ?? new SportsStateStore();
  }

  async get(
    endpoint: string,
    parameters: Record<string, string | number>,
    context: ProviderContext = {},
  ): Promise<unknown> {
    const url = new URL(endpoint, `${this.baseUrl}/`);
    Object.entries(parameters).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const response = await fetchWithRetry(
      url.toString(),
      {
        headers: {
          accept: "application/json",
          "x-apisports-key": this.apiKey,
        },
        signal: context.signal,
      },
      {
        timeoutMs: 8_000,
        retries: 1,
        retryDelayMs: 500,
        beforeAttempt: async () => {
          await this.stateStore.reserveRequest(
            this.dailyLimit,
            context.now ?? new Date(),
          );
        },
      },
    );
    const envelope = apiEnvelopeSchema.parse(await response.json());
    if (hasApiErrors(envelope.errors)) {
      throw new Error(
        `API-Football rechazó la consulta: ${apiErrorMessage(envelope.errors)}`,
      );
    }
    return envelope.response;
  }
}

export interface ApiFootballProviderOptions {
  season: number;
  teamId?: number;
  leagueId?: number;
  teamName?: string;
  leagueName?: string;
}

function comparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamMatchScore(candidateName: string, expectedName: string): number {
  const candidate = comparable(candidateName);
  const expected = comparable(expectedName);
  if (candidate === expected) return 100;

  if (expected.includes("zaragoza")) {
    if (
      /\b(?:women|femenino|femenina|u\d+|juvenil|b)\b/.test(candidate) ||
      candidate.includes("deportivo aragon")
    ) {
      return 0;
    }
    if (candidate === "zaragoza") return 90;
    if (candidate === "real zaragoza") return 85;
    if (candidate.includes("zaragoza")) return 50;
  }

  return 0;
}

function automaticLeagueScore(
  league: z.infer<typeof leaguesResponseSchema>[number]["league"],
): number {
  const name = comparable(league.name);
  if (
    name.includes("segunda division") ||
    name.includes("la liga 2") ||
    name.includes("laliga hypermotion")
  ) {
    return 100;
  }
  if (comparable(league.type ?? "") === "league") return 50;
  return 0;
}

function abbreviation(name: string): string {
  if (comparable(name) === "real zaragoza") return "RZ";
  const words = name
    .replace(/\b(?:club|de|del|la|el|cf|fc|ud|ad)\b/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (words.length > 1
    ? words.map((word) => word[0]).join("")
    : name.slice(0, 3)
  )
    .slice(0, 3)
    .toLocaleUpperCase("es");
}

function shortName(name: string): string {
  if (comparable(name) === "real zaragoza") return "Zaragoza";
  return name
    .replace(/\b(?:Club de Fútbol|Club de Futbol|C\.?F\.?|F\.?C\.?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedTeam(
  raw: z.infer<typeof teamSchema>,
  zaragozaId: number,
): Team {
  const isZaragoza = raw.id === zaragozaId;
  return {
    id: isZaragoza ? "real-zaragoza" : `api-football-team-${raw.id}`,
    name: raw.name,
    shortName: isZaragoza ? "Zaragoza" : shortName(raw.name),
    abbreviation: isZaragoza ? "RZ" : abbreviation(raw.name),
  };
}

function matchStatus(short: string): MatchStatus {
  if (["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"].includes(short)) {
    return "live";
  }
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST", "CANC", "ABD", "AWD", "WO"].includes(short)) {
    return "postponed";
  }
  return "scheduled";
}

function sourceReference(fetchedAt: string): SourceReference {
  return {
    id: "api-football",
    name: "API-Football",
    url: "https://www.api-football.com/",
    fetchedAt,
    isOfficial: false,
  };
}

export class ApiFootballProvider implements SportsProvider {
  readonly id = "api-football";
  private metadata?: SportsProviderMetadata;

  constructor(
    private readonly client: ApiFootballTransport,
    private readonly options: ApiFootballProviderOptions,
  ) {}

  async resolveMetadata(
    context: ProviderContext = {},
    cached?: SportsProviderMetadata,
  ): Promise<SportsProviderMetadata> {
    if (this.metadata && !context.force) return this.metadata;

    const season = this.options.season;
    let teamId = this.options.teamId ?? cached?.teamId;
    let teamName = this.options.teamName ?? cached?.teamName ?? "Real Zaragoza";
    const cachedForSeason = cached?.season === season ? cached : undefined;
    let leagueId = this.options.leagueId ?? cachedForSeason?.leagueId;
    let leagueName =
      this.options.leagueName?.trim() || cachedForSeason?.leagueName;

    if (!teamId || (context.force && !this.options.teamId)) {
      const searchTerm = comparable(teamName).includes("zaragoza")
        ? "Zaragoza"
        : teamName;
      const teams = teamsResponseSchema.parse(
        await this.client.get("teams", { search: searchTerm }, context),
      );
      const match = teams
        .map((entry) => ({
          entry,
          score: teamMatchScore(entry.team.name, teamName),
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((first, second) => second.score - first.score)[0]?.entry;
      if (!match) {
        const candidates = teams
          .slice(0, 5)
          .map((entry) => entry.team.name)
          .join(", ");
        const responseDetail = candidates
          ? ` (resultados recibidos: ${candidates})`
          : "";
        throw new Error(
          `API-Football no encontró el equipo ${teamName}${responseDetail}`,
        );
      }
      teamId = match.team.id;
      teamName = match.team.name;
    }

    if (!leagueId || (context.force && !this.options.leagueId)) {
      const leagues = leaguesResponseSchema.parse(
        await this.client.get(
          "leagues",
          { team: teamId, season },
          context,
        ),
      );
      const desiredName = leagueName ? comparable(leagueName) : undefined;
      const match = desiredName
        ? leagues.find((entry) => {
            const candidate = comparable(entry.league.name);
            return (
              candidate === desiredName ||
              (candidate.includes("primera division rfef") &&
                candidate.includes("group 2"))
            );
          })
        : leagues
            .map((entry) => ({
              entry,
              score: automaticLeagueScore(entry.league),
            }))
            .filter((candidate) => candidate.score > 0)
            .sort((first, second) => second.score - first.score)[0]?.entry;
      if (!match) {
        const available = leagues
          .slice(0, 5)
          .map((entry) => entry.league.name)
          .join(", ");
        const expected = leagueName
          ? leagueName
          : "una competición de liga";
        const responseDetail = available
          ? ` (competiciones recibidas: ${available})`
          : "";
        throw new Error(
          `API-Football no encontró ${expected} para la temporada ${season}${responseDetail}`,
        );
      }
      leagueId = match.league.id;
      leagueName = match.league.name;
    }

    if (!leagueName) {
      throw new Error("API-Football no devolvió el nombre de la competición");
    }
    this.metadata = { teamId, teamName, leagueId, leagueName, season };
    return this.metadata;
  }

  async getMatchesFor(
    metadata: SportsProviderMetadata,
    context: ProviderContext = {},
  ): Promise<Match[]> {
    const fetchedAt = (context.now ?? new Date()).toISOString();
    const fixtures = fixturesResponseSchema.parse(
      await this.client.get(
        "fixtures",
        { team: metadata.teamId, season: metadata.season },
        context,
      ),
    );

    return fixtures
      .map((item): Match => {
        const status = matchStatus(item.fixture.status.short);
        const hasScore =
          item.goals.home !== null && item.goals.away !== null;
        return {
          id: `api-football-fixture-${item.fixture.id}`,
          competition: {
            id: `api-football-league-${item.league.id}-${item.league.season}`,
            name: item.league.name,
            shortName:
              item.league.id === metadata.leagueId
                ? "Primera Federación"
                : item.league.name,
            season: `${item.league.season}/${String(item.league.season + 1).slice(-2)}`,
          },
          round: item.league.round || "Jornada por confirmar",
          startsAt: item.fixture.date,
          scheduleStatus: ["TBD", "TBS"].includes(item.fixture.status.short)
            ? "provisional"
            : "confirmed",
          status,
          venue: item.fixture.venue?.name || "Por confirmar",
          homeTeam: normalizedTeam(item.teams.home, metadata.teamId),
          awayTeam: normalizedTeam(item.teams.away, metadata.teamId),
          score: hasScore
            ? { home: item.goals.home!, away: item.goals.away! }
            : undefined,
          source: sourceReference(fetchedAt),
          updatedAt: fetchedAt,
        };
      })
      .sort(
        (first, second) =>
          new Date(first.startsAt).getTime() -
          new Date(second.startsAt).getTime(),
      );
  }

  async getStandingsFor(
    metadata: SportsProviderMetadata,
    context: ProviderContext = {},
  ): Promise<StandingEntry[]> {
    const response = standingsResponseSchema.parse(
      await this.client.get(
        "standings",
        { league: metadata.leagueId, season: metadata.season },
        context,
      ),
    );
    const league = response[0]?.league;
    if (!league) {
      throw new Error("API-Football no devolvió una clasificación");
    }

    return league.standings
      .flat()
      .map((entry): StandingEntry => ({
        position: entry.rank,
        team: normalizedTeam(entry.team, metadata.teamId),
        played: entry.all.played,
        won: entry.all.win,
        drawn: entry.all.draw,
        lost: entry.all.lose,
        goalDifference: entry.goalsDiff,
        points: entry.points,
      }))
      .sort((first, second) => first.position - second.position);
  }

  async getMatches(context: ProviderContext = {}): Promise<Match[]> {
    return this.getMatchesFor(await this.resolveMetadata(context), context);
  }

  async getStandings(
    context: ProviderContext = {},
  ): Promise<StandingEntry[]> {
    return this.getStandingsFor(await this.resolveMetadata(context), context);
  }
}
