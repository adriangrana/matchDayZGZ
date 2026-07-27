export type IsoDateString = string;

export type Freshness = "fresh" | "stale" | "unknown";
export type MatchStatus = "scheduled" | "live" | "finished" | "postponed";
export type ScheduleStatus = "confirmed" | "provisional";
export type VenueSide = "home" | "away";
export type NewsCategory =
  | "oficial"
  | "fichajes"
  | "plantilla"
  | "partidos"
  | "entrenamientos"
  | "cantera"
  | "abonados"
  | "estadio"
  | "institucional"
  | "otros";
export type ConfirmationLevel =
  | "official"
  | "confirmed"
  | "negotiation"
  | "rumor"
  | "dismissed"
  | "unknown";

export interface SourceReference {
  id: string;
  name: string;
  url: string;
  fetchedAt: IsoDateString;
  isOfficial?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  crestUrl?: string;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  season: string;
}

export interface Score {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  competition: Competition;
  round: string;
  startsAt: IsoDateString;
  scheduleStatus: ScheduleStatus;
  status: MatchStatus;
  venue: string;
  homeTeam: Team;
  awayTeam: Team;
  score?: Score;
  source: SourceReference;
  updatedAt: IsoDateString;
}

export interface StandingEntry {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
}

export interface DailyRequestUsage {
  date: string;
  used: number;
  limit: number;
  remaining: number;
}

export interface SportsSyncTimes {
  fixtures?: IsoDateString;
  standings?: IsoDateString;
  metadata?: IsoDateString;
}

export interface SportsDashboardSnapshot extends MatchDaySnapshot {
  mode: "real" | "demo";
  stale: boolean;
  sourceErrors: string[];
  requestUsage: DailyRequestUsage;
  syncTimes: SportsSyncTimes;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  originalUrl: string;
  canonicalUrl: string;
  author?: string;
  publishedAt: IsoDateString;
  updatedAt: IsoDateString;
  category: NewsCategory;
  confirmation: ConfirmationLevel;
  source: SourceReference;
  imageUrl?: string;
  relatedEntityIds: string[];
  syncedAt: IsoDateString;
}

export interface NewsGroup {
  primary: NewsArticle;
  related: NewsArticle[];
  sourceCount: number;
  relevanceScore: number;
}

export interface NewsFeedSnapshot {
  groups: NewsGroup[];
  syncedAt: IsoDateString;
  stale: boolean;
  mode: "real" | "demo";
  sourceErrors: string[];
}

export interface MatchDaySnapshot {
  nextMatch: Match;
  recentMatches: Match[];
  upcomingMatches: Match[];
  standings: StandingEntry[];
  news: NewsArticle[];
  dailyBrief: string;
  generatedAt: IsoDateString;
  freshness: Freshness;
  isDemo: boolean;
}
