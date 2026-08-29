import { forceNewsSync } from "@/src/services/news-service";
import { authorizeInternalSync } from "@/src/services/internal-sync-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = authorizeInternalSync(
    request,
    process.env.NEWS_SYNC_SECRET,
  );
  if (unauthorized) return unauthorized;

  try {
    const snapshot = await forceNewsSync();
    return Response.json(
      {
        ok: true,
        syncedAt: snapshot.syncedAt,
        groups: snapshot.groups.length,
        sourceErrors: snapshot.sourceErrors,
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
