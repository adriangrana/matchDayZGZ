import type { Metadata } from "next";
import { Header } from "@/src/components/header";
import { NewsCard } from "@/src/components/news-card";
import type { NewsCategory, NewsGroup } from "@/src/domain/models";
import { getNewsSnapshot } from "@/src/services/news-service";
import { normalizeTitle } from "@/src/services/news-normalization";

export const metadata: Metadata = {
  title: "Actualidad",
  description:
    "Noticias, fuentes y cobertura relacionada sobre el Real Zaragoza.",
};

const categories: Array<{ value: NewsCategory | "todas"; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "oficial", label: "Oficial" },
  { value: "fichajes", label: "Fichajes" },
  { value: "plantilla", label: "Plantilla" },
  { value: "partidos", label: "Partidos" },
  { value: "entrenamientos", label: "Entrenamientos" },
  { value: "cantera", label: "Cantera" },
  { value: "abonados", label: "Abonados" },
  { value: "estadio", label: "Estadio" },
  { value: "institucional", label: "Institucional" },
  { value: "otros", label: "Otros" },
];

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function queryString(values: Record<string, string | number | boolean>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value !== false && value !== "todas") {
      params.set(key, String(value));
    }
  });
  const result = params.toString();
  return result ? `?${result}` : "";
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = one(params.q).trim();
  const category = one(params.category) || "todas";
  const officialOnly = one(params.official) === "1";
  const requestedPage = Math.max(1, Number(one(params.page)) || 1);
  const snapshot = await getNewsSnapshot();
  const now = new Date();

  const filtered = snapshot.groups.filter((group) => {
    const article = group.primary;
    if (category !== "todas" && article.category !== category) return false;
    if (officialOnly && article.confirmation !== "official") return false;
    if (!query) return true;
    const searchable = normalizeTitle(
      `${article.title} ${article.summary} ${article.author ?? ""} ${article.source.name}`,
    );
    return searchable.includes(normalizeTitle(query));
  });

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="site-shell">
      <Header active="news" />
      <main className="news-page page-container">
        <div className="news-page-header">
          <p className="eyebrow">Actualidad zaragocista</p>
          <h1 className="page-title page-title-editorial">
            <span>Todo lo que está</span>
            <strong>pasando</strong>
          </h1>
          <p>
            Información de fuentes locales y deportivas, agrupada y enlazada
            siempre a la publicación original.
          </p>
          <div
            className={snapshot.stale ? "sync-state sync-state-stale" : "sync-state"}
          >
            <span aria-hidden="true" />
            {snapshot.mode === "demo"
              ? "Modo demo"
              : snapshot.stale
                ? "Últimos datos válidos · sincronización pendiente"
                : `Actualizado ${new Intl.DateTimeFormat("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Madrid",
                  }).format(new Date(snapshot.syncedAt))}`}
          </div>
        </div>

        <form className="news-filters" action="/actualidad" method="get">
          <label className="news-search">
            <span className="sr-only">Buscar noticias</span>
            <span aria-hidden="true">⌕</span>
            <input
              defaultValue={query}
              name="q"
              placeholder="Buscar jugador, entrenador o tema"
              type="search"
            />
          </label>
          <label className="official-filter">
            <input
              defaultChecked={officialOnly}
              name="official"
              type="checkbox"
              value="1"
            />
            <span>Solo oficial</span>
          </label>
          {category !== "todas" && (
            <input name="category" type="hidden" value={category} />
          )}
          <button type="submit">Aplicar</button>
        </form>

        <nav className="category-tabs" aria-label="Filtrar por categoría">
          {categories.map((item) => (
            <a
              className={category === item.value ? "active" : ""}
              href={`/actualidad${queryString({
                category: item.value,
                q: query,
                official: officialOnly ? 1 : "",
              })}`}
              key={item.value}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {visible.length > 0 ? (
          <>
            <div className="news-results-heading">
              <span>
                {filtered.length}{" "}
                {filtered.length === 1 ? "cobertura" : "coberturas"}
              </span>
              <small>Ordenadas por relevancia y fecha</small>
            </div>
            <div className="news-page-grid">
              {visible.map((group: NewsGroup, index) => (
                <NewsCard
                  group={group}
                  key={group.primary.id}
                  now={now}
                  priority={index < 2}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="pagination" aria-label="Paginación">
                {page > 1 ? (
                  <a
                    href={`/actualidad${queryString({
                      q: query,
                      category,
                      official: officialOnly ? 1 : "",
                      page: page - 1,
                    })}`}
                  >
                    ← Anterior
                  </a>
                ) : (
                  <span />
                )}
                <span>
                  Página {page} de {totalPages}
                </span>
                {page < totalPages ? (
                  <a
                    href={`/actualidad${queryString({
                      q: query,
                      category,
                      official: officialOnly ? 1 : "",
                      page: page + 1,
                    })}`}
                  >
                    Siguiente →
                  </a>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="news-empty">
            <span aria-hidden="true">MZ</span>
            <h2>No hay noticias para estos filtros</h2>
            <p>
              Prueba otra categoría o elimina la búsqueda. No rellenamos los
              huecos con contenido inventado.
            </p>
            <a href="/actualidad">Limpiar filtros</a>
          </div>
        )}
      </main>
    </div>
  );
}
