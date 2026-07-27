import type { Freshness } from "@/src/domain/models";

export function getFreshness(
  updatedAt: string | undefined,
  now = new Date(),
  staleAfterMinutes = 90,
): Freshness {
  if (!updatedAt) return "unknown";

  const timestamp = new Date(updatedAt).getTime();
  if (Number.isNaN(timestamp)) return "unknown";

  const ageInMinutes = (now.getTime() - timestamp) / 60_000;
  return ageInMinutes <= staleAfterMinutes ? "fresh" : "stale";
}

