import type { Match } from "@/src/domain/models";

const LIVE_GRACE_MS = 2 * 60 * 1_000;
const LIVE_WINDOW_MS = 150 * 60 * 1_000;

/**
 * A persisted snapshot can be several minutes old. Derive the obvious live
 * state from a confirmed kickoff whenever the page is read so a match does
 * not disappear just because the live-score provider or sync loop is late.
 *
 * This only changes scheduled -> live. It never invents a score and never
 * overrides finished/postponed data received from a source.
 */
export function withRuntimeMatchStatus(match: Match, now = new Date()): Match {
  if (match.status !== "scheduled" || match.scheduleStatus !== "confirmed") {
    return match;
  }

  const startsAt = new Date(match.startsAt).getTime();
  if (!Number.isFinite(startsAt)) return match;

  const elapsed = now.getTime() - startsAt;
  if (elapsed < LIVE_GRACE_MS || elapsed > LIVE_WINDOW_MS) return match;

  return { ...match, status: "live" };
}

export function withRuntimeMatchStatuses(
  matches: Match[],
  now = new Date(),
): Match[] {
  return matches.map((match) => withRuntimeMatchStatus(match, now));
}
