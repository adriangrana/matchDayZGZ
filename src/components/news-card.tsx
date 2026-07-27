import type { NewsGroup } from "@/src/domain/models";
import { NewsImage } from "@/src/components/news-image";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
});

function ageLabel(publishedAt: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(publishedAt).getTime()) / 60_000,
    ),
  );
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `hace ${days} d`;
  return dateFormatter.format(new Date(publishedAt)).replace(".", "");
}

function confirmationLabel(confirmation: NewsGroup["primary"]["confirmation"]) {
  const labels = {
    official: "Oficial",
    confirmed: "Confirmado",
    negotiation: "En negociación",
    rumor: "Rumor",
    dismissed: "Descartado",
    unknown: "",
  };
  return labels[confirmation];
}

export function NewsCard({
  group,
  now,
  featured = false,
  priority = false,
}: {
  group: NewsGroup;
  now: Date;
  featured?: boolean;
  priority?: boolean;
}) {
  const article = group.primary;
  const confirmation = confirmationLabel(article.confirmation);

  return (
    <article className={featured ? "news-card news-card-featured" : "news-card"}>
      <div className="news-visual">
        <NewsImage
          category={article.category}
          imageUrl={article.imageUrl}
          priority={priority}
          title={article.title}
        />
      </div>
      <div className="news-copy">
        <div className="news-meta">
          <span className="category-pill">{article.category}</span>
          <span>{ageLabel(article.publishedAt, now)}</span>
          {confirmation && (
            <span
              className={`confirmation-pill confirmation-${article.confirmation}`}
            >
              {confirmation}
            </span>
          )}
          {group.sourceCount > 1 && (
            <span className="coverage-pill">
              {group.sourceCount} fuentes
            </span>
          )}
        </div>
        <h3>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {article.title}
          </a>
        </h3>
        {article.summary && <p>{article.summary}</p>}
        <div className="news-source-row">
          <span>
            {article.source.name}
            {article.author ? ` · ${article.author}` : ""}
          </span>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={`Leer en ${article.source.name}: ${article.title}`}
          >
            Leer original <span aria-hidden="true">↗</span>
          </a>
        </div>
        {group.related.length > 0 && (
          <details className="related-coverage">
            <summary>
              Ver cobertura relacionada ({group.related.length})
            </summary>
            <ul>
              {group.related.map((related) => (
                <li key={related.id}>
                  <a
                    href={related.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <span>{related.source.name}</span>
                    {related.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}

