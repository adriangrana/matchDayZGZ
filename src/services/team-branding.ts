import snapshot from "@/src/data/team-branding-snapshot.json";
import groupOneSnapshot from "@/src/data/team-branding-group1-snapshot.json";
import type {
  TeamBrandingRecord,
  TeamBrandingSnapshot,
} from "@/src/providers/team-branding-provider";

const brandingSnapshot = snapshot as TeamBrandingSnapshot;
const groupOneBrandingSnapshot = groupOneSnapshot as TeamBrandingSnapshot;
// Assets validados en la primera sincronización del Grupo I. Se mantienen
// utilizables aunque una revalidación posterior encuentre un 429 temporal.
const groupOneLocalBadgeIds = new Set([
  "ad-merida",
  "arenas-club",
  "athletic-club-b",
  "barakaldo-cf",
  "cd-coria",
  "cd-extremadura",
  "cd-lugo",
  "cd-mirandes",
  "cp-cacereno",
  "cyd-leonesa",
  "pontevedra-cf",
  "racing-club-ferrol",
  "rc-deportivo-fabril",
  "real-aviles-industrial",
  "real-union-club",
  "sd-ponferradina",
  "ud-logrones",
  "ud-ourense",
  "unionistas-de-salamanca-cf",
  "zamora-cf",
]);
const records = new Map(
  [...brandingSnapshot.records, ...groupOneBrandingSnapshot.records].map((record) => [
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
  if (record?.validation === "validated") {
    return record.localAssetPath ?? record.badgeUrl;
  }
  return groupOneLocalBadgeIds.has(canonicalTeamId)
    ? `/team-badges/${canonicalTeamId}.png`
    : undefined;
}

export function getTeamBrandingSnapshot(): TeamBrandingSnapshot {
  return brandingSnapshot;
}
