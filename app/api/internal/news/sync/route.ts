import { forceNewsSync } from "@/src/services/news-service";

export const dynamic = "force-dynamic";

function constantTimeEqual(first: string, second: string): boolean {
  const firstBytes = new TextEncoder().encode(first);
  const secondBytes = new TextEncoder().encode(second);
  const length = Math.max(firstBytes.length, secondBytes.length);
  let difference = firstBytes.length ^ secondBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |=
      (firstBytes[index] ?? 0) ^ (secondBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function POST(request: Request) {
  const secret = process.env.NEWS_SYNC_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "NEWS_SYNC_SECRET no está configurado" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!provided || !constantTimeEqual(provided, secret)) {
    return Response.json(
      { ok: false, error: "No autorizado" },
      { status: 401 },
    );
  }

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

