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
  const liveSources =
    sports.status === "fulfilled"
      ? sports.value.diagnostics
          .filter((diagnostic) =>
            [
              "rfef-live-scoreboard",
              "sofascore-live-fallback",
              "sofascore-matchday-fallback",
              "rfef-results-article",
            ].includes(diagnostic.id),
          )
          .map((diagnostic) => ({
            id: diagnostic.id,
            status: diagnostic.policyStatus,
            extracted: diagnostic.extracted.matches,
            httpStatus: diagnostic.httpStatus,
            error: diagnostic.error,
          }))
      : [];

  return Response.json(
    {
      ok: errors.length === 0,
      partial: errors.length === 1,
      syncedAt,
      errors,
      liveSources,
    },
    {
      status: errors.length === 2 ? 502 : 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
