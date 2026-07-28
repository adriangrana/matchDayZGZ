export type TeamBadgeValidation =
  | "validated"
  | "not-found"
  | "ambiguous"
  | "rejected";

export interface TeamBrandingRecord {
  canonicalTeamId: string;
  canonicalName: string;
  aliases: string[];
  provider: "thesportsdb";
  providerTeamId?: string;
  badgeUrl?: string;
  localAssetPath?: string;
  syncedAt: string;
  validation: TeamBadgeValidation;
  provenance: string;
  reason?: string;
  image?: {
    mimeType: string;
    width: number;
    height: number;
  };
}

export interface TeamBrandingSnapshot {
  provider: "thesportsdb";
  syncedAt: string;
  refreshAfter: string;
  teamFingerprint: string;
  records: TeamBrandingRecord[];
  stats: {
    processed: number;
    found: number;
    validated: number;
    rejected: number;
    ambiguous: number;
    missing: number;
    requests: number;
    fromCache: number;
  };
}

export interface TeamBrandingProvider {
  readonly id: string;
  sync(options?: {
    force?: boolean;
    now?: Date;
  }): Promise<TeamBrandingSnapshot>;
  inspect(): Promise<TeamBrandingSnapshot | undefined>;
}
