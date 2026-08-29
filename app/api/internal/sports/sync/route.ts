import type { FreeSportsInspection, NormalizedGroupMatch } from "@/src/providers/free-sports-types";
import { authorizeInternalSync } from "@/src/services/internal-sync-auth";
import { synchronizeFreeSports } from "@/src/services/free-sports-sync";

export const dynamic = "force-dynamic";

function nextSportsSyncSeconds(snapshot: FreeSportsInspection): number {
  const now = Date.now();
  const matches: NormalizedGroupMatch[] = [
    ...snapshot.matches,
    ...(snapshot.groupOneMatches ?? []),
  ];
  const live = matches.some((match) => match.status === "live");
  if (live) return 60;

  const confirmed = matches.filter(
    (match) => match.kickoffStatus === "confirmed" && match.status === "scheduled",
  );
  const activeWindow = confirmed.some((match) => {
    const startsAt = new Date(match.startsAt).getTime();
    return startsAt >= now - 3 * 60 * 60 * 1_000 && startsAt <= now + 30 * 60 * 1_000;
  });
  if (activeWindow) return 90;

  const futureStarts = confirmed
    .map((match) => new Date(match.startsAt).getTime())
    .filter((startsAt) => startsAt > now)
    .sort((a, b) => a - b);
  const nextStart = futureStarts[0];
  if (!nextStart) return 6 * 60 * 60;

  const untilNext = nextStart - now;
  if (untilNext <= 6 * 60 * 60 * 1_000) return 3 * 60;
  if (untilNext <= 24 * 60 * 60 * 1_000) return 15 * 60;
  return 6 * 60 * 60;
}

export async function POST(request: Request) {
  const unauthorized = authorizeInternalSync(
    request,
    process.env.SPORTS_SYNC_SECRET,
  );
  if (unauthorized) return unauthorized;

  try {
    const snapshot = await synchronizeFreeSports();
    const allMatches = [
      ...snapshot.matches,
      ...(snapshot.groupOneMatches ?? []),
    ];
    const liveMatches = allMatches.filter((match) => match.status === "live").length;
    return Response.json(
      {
        ok: true,
        syncedAt: snapshot.syncedAt,
        requests: snapshot.requestCount,
        matches: snapshot.matches.length,
        standings: snapshot.standings.length,
        liveMatches,
        nextSportsSyncSeconds: nextSportsSyncSeconds(snapshot),
        stale: snapshot.diagnostics.some(
          (diagnostic) =>
            diagnostic.policyStatus === "unavailable" ||
            diagnostic.cache === "stale",
        ),
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error de sincronización",
      },
      { status: 502 },
    );
  }
}
