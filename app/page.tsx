import { Countdown } from "@/src/components/countdown";
import { DemoBadge } from "@/src/components/demo-badge";
import { Header } from "@/src/components/header";
import { TeamMark } from "@/src/components/team-mark";
import { DemoMatchDayProvider } from "@/src/providers/demo-match-day-provider";
import type { Match, NewsArticle } from "@/src/domain/models";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value)).replace(".", "");
}

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function MatchRow({
  match,
  upcoming = false,
}: {
  match: Match;
  upcoming?: boolean;
}) {
  const zaragozaIsHome = match.homeTeam.id === "real-zaragoza";
  const rival = zaragozaIsHome ? match.awayTeam : match.homeTeam;
  const venueSide = zaragozaIsHome ? "Local" : "Visitante";

  return (
    <article className="match-row">
      <div className="match-date">
        <span>{formatDate(match.startsAt)}</span>
        <small>{upcoming ? formatTime(match.startsAt) : match.round}</small>
      </div>
      <TeamMark team={rival} size="small" />
      <div className="match-team">
        <strong>{rival.shortName}</strong>
        <span>{venueSide}</span>
      </div>
      {upcoming ? (
        <span className="match-time">{formatTime(match.startsAt)}</span>
      ) : (
        <strong className="match-score">
          {match.score?.home ?? "–"} <span>:</span> {match.score?.away ?? "–"}
        </strong>
      )}
    </article>
  );
}

function NewsCard({
  article,
  featured = false,
}: {
  article: NewsArticle;
  featured?: boolean;
}) {
  return (
    <article className={featured ? "news-card news-card-featured" : "news-card"}>
      <div className="news-placeholder" aria-hidden="true">
        <span>MZ</span>
        <small>{article.category}</small>
      </div>
      <div className="news-copy">
        <div className="news-meta">
          <span className="category-pill">{article.category}</span>
          <span>{formatDate(article.publishedAt)}</span>
          {article.confirmation === "oficial" && (
            <span className="official-pill">Oficial</span>
          )}
        </div>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
        <span className="source-label">Fuente demo · sin enlace real</span>
      </div>
    </article>
  );
}

export default async function Home() {
  const provider = new DemoMatchDayProvider();
  const snapshot = await provider.getSnapshot();
  const nextMatch = snapshot.nextMatch;
  const zaragozaIsHome = nextMatch.homeTeam.id === "real-zaragoza";

  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero-section page-container" id="inicio">
          <div className="hero-heading">
            <div>
              <DemoBadge />
              <p className="eyebrow">Todo el zaragocismo, en un solo lugar</p>
              <h1>El partido empieza aquí.</h1>
            </div>
            <p className="hero-intro">
              Partidos, clasificación y actualidad en una experiencia rápida,
              clara y pensada para acompañarte cada jornada.
            </p>
          </div>

          <div className="hero-grid">
            <article className="next-match-card" aria-labelledby="next-match-title">
              <div className="card-topline">
                <div>
                  <span className="live-dot" />
                  <span id="next-match-title">Próximo partido</span>
                </div>
                <span className="schedule-pill">Horario provisional</span>
              </div>

              <div className="competition-line">
                <span>{nextMatch.competition.name}</span>
                <span>{nextMatch.round}</span>
              </div>

              <div className="teams-line">
                <div className="team-block">
                  <TeamMark team={nextMatch.homeTeam} featured />
                  <div>
                    <strong>{nextMatch.homeTeam.shortName}</strong>
                    <span>{zaragozaIsHome ? "Local" : "Visitante"}</span>
                  </div>
                </div>
                <div className="versus">
                  <span>VS</span>
                  <small>{formatTime(nextMatch.startsAt)}</small>
                </div>
                <div className="team-block team-block-away">
                  <TeamMark team={nextMatch.awayTeam} featured />
                  <div>
                    <strong>{nextMatch.awayTeam.shortName}</strong>
                    <span>{zaragozaIsHome ? "Visitante" : "Local"}</span>
                  </div>
                </div>
              </div>

              <div className="match-details">
                <div>
                  <span className="detail-icon" aria-hidden="true">◷</span>
                  <span>
                    <strong>{formatDate(nextMatch.startsAt)}</strong>
                    {formatTime(nextMatch.startsAt)} h
                  </span>
                </div>
                <div>
                  <span className="detail-icon" aria-hidden="true">⌖</span>
                  <span>
                    <strong>{nextMatch.venue}</strong>
                    Zaragoza
                  </span>
                </div>
              </div>

              <Countdown targetDate={nextMatch.startsAt} />
            </article>

            <aside className="brief-card" aria-labelledby="brief-title">
              <div className="brief-icon" aria-hidden="true">✦</div>
              <span className="eyebrow">Radar zaragocista</span>
              <h2 id="brief-title">La actualidad, en 30 segundos</h2>
              <p>{snapshot.dailyBrief}</p>
              <div className="brief-footer">
                <span>Resumen automático · Demo</span>
                <span>Actualizado 20:00</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="content-section page-container" id="partidos">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Temporada 2026/27 · Demo</p>
              <h2>La jornada, de un vistazo</h2>
            </div>
            <a href="#partidos" className="text-link">
              Ver calendario <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="dashboard-grid">
            <div className="panel results-panel">
              <div className="panel-heading">
                <h3>Últimos resultados</h3>
                <span>3 partidos</span>
              </div>
              <div className="match-list">
                {snapshot.recentMatches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            </div>

            <div className="panel fixtures-panel">
              <div className="panel-heading">
                <h3>Próximos encuentros</h3>
                <span>Horario peninsular</span>
              </div>
              <div className="match-list">
                {snapshot.upcomingMatches.map((match) => (
                  <MatchRow key={match.id} match={match} upcoming />
                ))}
              </div>
            </div>

            <div className="panel standing-panel" id="clasificacion">
              <div className="panel-heading">
                <h3>Clasificación</h3>
                <span>Pretemporada</span>
              </div>
              <div className="standing-header">
                <span>Pos</span>
                <span>Equipo</span>
                <span>PJ</span>
                <span>DG</span>
                <span>PTS</span>
              </div>
              <div className="standing-list">
                {snapshot.standings.map((entry) => (
                  <div
                    className={
                      entry.team.id === "real-zaragoza"
                        ? "standing-row standing-row-highlight"
                        : "standing-row"
                    }
                    key={entry.team.id}
                  >
                    <span>{entry.position}</span>
                    <span className="standing-team">
                      <TeamMark team={entry.team} size="tiny" />
                      {entry.team.shortName}
                    </span>
                    <span>{entry.played}</span>
                    <span>{entry.goalDifference}</span>
                    <strong>{entry.points}</strong>
                  </div>
                ))}
              </div>
              <p className="standing-note">
                La competición aún no ha comenzado. Posiciones ilustrativas.
              </p>
            </div>
          </div>
        </section>

        <section className="news-section page-container" id="actualidad">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Actualidad</p>
              <h2>Lo que mueve al zaragocismo</h2>
            </div>
            <a href="#actualidad" className="text-link">
              Toda la actualidad <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="news-grid">
            {snapshot.news.map((article, index) => (
              <NewsCard key={article.id} article={article} featured={index === 0} />
            ))}
          </div>
        </section>

        <section className="demo-notice page-container" aria-label="Aviso de datos">
          <div className="demo-notice-mark" aria-hidden="true">D</div>
          <div>
            <strong>Estás viendo una demostración funcional</strong>
            <p>
              Todos los partidos, resultados, posiciones y noticias de esta
              versión son ficticios. La capa de proveedores ya está preparada
              para incorporar fuentes autorizadas sin cambiar la interfaz.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="page-container footer-inner">
          <div className="footer-brand">
            <span className="brand-mark">MZ</span>
            <span>
              <strong>MatchDay</strong>
              <small>ZGZ</small>
            </span>
          </div>
          <p>Hecho en Zaragoza para quienes nunca dejan de creer.</p>
          <span>Fase 1 · Datos demo</span>
        </div>
      </footer>
    </div>
  );
}

