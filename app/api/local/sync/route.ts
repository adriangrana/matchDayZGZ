import { forceNewsSync } from "@/src/services/news-service";
import { synchronizeFreeSports } from "@/src/services/free-sports-sync";
import { isAuthorizedLocalSyncRequest } from "@/src/services/local-sync-access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorizedLocalSyncRequest(request)) {
    return Response.json(
      { ok: false, error: "La sincronización manual solo está disponible localmente" },
      { status: 403 },
    );
  }

  const [sports, news] = await Promise.allSettled([
    synchronizeFreeSports({ force: true }),
    forceNewsSync(),
  ]);
  const errors = [
    sports.status === "rejected" ? "No se pudieron actualizar los datos deportivos" : undefined,
    news.status === "rejected" ? "No se pudieron actualizar las noticias" : undefined,
  ].filter((value): value is string => Boolean(value));
  const syncedAt =
    sports.status === "fulfilled"
      ? sports.value.syncedAt
      : news.status === "fulfilled"
        ? news.value.syncedAt
        : new Date().toISOString();

  return Response.json(
    {
      ok: errors.length === 0,
      partial: errors.length === 1,
      syncedAt,
      errors,
    },
    {
      status: errors.length === 2 ? 502 : 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
