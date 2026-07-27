import type {
  Match,
  MatchDaySnapshot,
  NewsArticle,
  StandingEntry,
} from "@/src/domain/models";

export interface ProviderContext {
  signal?: AbortSignal;
  now?: Date;
  force?: boolean;
}

export interface SportsProvider {
  readonly id: string;
  getMatches(context?: ProviderContext): Promise<Match[]>;
  getStandings(context?: ProviderContext): Promise<StandingEntry[]>;
}

export interface NewsProvider {
  readonly id: string;
  getNews(context?: ProviderContext): Promise<NewsArticle[]>;
}

export interface MatchDayProvider {
  readonly id: string;
  getSnapshot(context?: ProviderContext): Promise<MatchDaySnapshot>;
}
