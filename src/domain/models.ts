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
  | "club"
  | "estadio"
  | "abonados";
export type ConfirmationLevel =
  | "oficial"
  | "muy_probable"
  | "en_negociacion"
  | "rumor"
  | "descartado";

export interface SourceReference {
  id: string;
  name: string;
  url: string;
  fetchedAt: IsoDateString;
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

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  canonicalUrl: string;
  publishedAt: IsoDateString;
  category: NewsCategory;
  confirmation: ConfirmationLevel;
  source: SourceReference;
  imageUrl?: string;
  relatedEntityIds: string[];
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

