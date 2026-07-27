import type {
  Score,
  SourceReference,
  StandingEntry,
  Team,
} from "@/src/domain/models";

export type KickoffStatus = "confirmed" | "provisional" | "unknown";
export type SourcePolicyStatus =
  | "allowed"
  | "blocked-by-robots"
  | "blocked-by-terms"
  | "unavailable";

export interface NormalizedGroupMatch {
  id: string;
  round: number;
  roundLabel: string;
  dateBase: string;
  startsAt: string;
  kickoffStatus: KickoffStatus;
  homeTeam: Team;
  awayTeam: Team;
  venue?: string;
  score?: Score;
  status: "scheduled" | "finished" | "postponed";
  sources: SourceReference[];
  updatedAt: string;
}

export interface SourceDiagnostic {
  id: string;
  name: string;
  url: string;
  policyStatus: SourcePolicyStatus;
  httpStatus?: number;
  durationMs?: number;
  cache:
    | "fresh"
    | "revalidated"
    | "updated"
    | "miss"
    | "stale"
    | "disabled";
  extracted: {
    matches: number;
    standings: number;
  };
  placeholderKickoffsDiscarded: number;
  checkedAt: string;
  etag?: string;
  lastModified?: string;
  hash?: string;
  error?: string;
}

export interface FreeSportsInspection {
  provider: "free-web";
  syncedAt: string;
  requestCount: number;
  diagnostics: SourceDiagnostic[];
  matches: NormalizedGroupMatch[];
  zaragozaMatches: NormalizedGroupMatch[];
  standings: StandingEntry[];
  publishedStandings?: StandingEntry[];
  differences: string[];
  reviewRequired: boolean;
}

export interface OfficialMatchPatch {
  round?: number;
  homeTeamName: string;
  awayTeamName: string;
  startsAt?: string;
  kickoffStatus: KickoffStatus;
  venue?: string;
  score?: Score;
  status?: "scheduled" | "finished" | "postponed";
  source: SourceReference;
}
