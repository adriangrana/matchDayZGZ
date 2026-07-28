import snapshot from "@/src/data/team-branding-snapshot.json";
import type {
  TeamBrandingRecord,
  TeamBrandingSnapshot,
} from "@/src/providers/team-branding-provider";

const brandingSnapshot = snapshot as TeamBrandingSnapshot;
const records = new Map(
  brandingSnapshot.records.map((record) => [
    record.canonicalTeamId,
    record,
  ]),
);

export function getTeamBranding(
  canonicalTeamId: string,
): TeamBrandingRecord | undefined {
  return records.get(canonicalTeamId);
}

export function getTeamBadgeUrl(
  canonicalTeamId: string,
): string | undefined {
  const record = getTeamBranding(canonicalTeamId);
  return record?.validation === "validated"
    ? record.localAssetPath ?? record.badgeUrl
    : undefined;
}

export function getTeamBrandingSnapshot(): TeamBrandingSnapshot {
  return brandingSnapshot;
}
