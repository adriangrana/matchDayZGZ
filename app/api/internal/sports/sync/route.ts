import { authorizeInternalSync } from "@/src/services/internal-sync-auth";
import { synchronizeFreeSports } from "@/src/services/free-sports-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = authorizeInternalSync(
    request,
    process.env.SPORTS_SYNC_SECRET,
  );
  if (unauthorized) return unauthorized;

  try {
    const snapshot = await synchronizeFreeSports();
    return Response.json(
      {
        ok: true,
        syncedAt: snapshot.syncedAt,
        requests: snapshot.requestCount,
        matches: snapshot.matches.length,
        standings: snapshot.standings.length,
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
