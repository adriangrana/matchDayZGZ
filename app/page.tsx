import { Countdown } from "@/src/components/countdown";
import { DemoBadge } from "@/src/components/demo-badge";
import { Header } from "@/src/components/header";
import { NewsCard } from "@/src/components/news-card";
import { TeamMark } from "@/src/components/team-mark";
import type { Match } from "@/src/domain/models";
import { getNewsSnapshot } from "@/src/services/news-service";
import { getSportsSnapshot } from "@/src/services/sports-service";

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

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  })
    .format(new Date(value))
    .replace(".", "");
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

export default async function Home() {
  const [snapshot, newsSnapshot] = await Promise.all([
    getSportsSnapshot(),
    getNewsSnapshot(),
  ]);
  const nextMatch = snapshot.nextMatch;
  const zaragozaIsHome = nextMatch.homeTeam.id === "real-zaragoza";
  const now = new Date();
  const renderedAt = now.toISOString();

  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero-section page-container" id="inicio">
          <div className="hero-heading">
            <div>
              <DemoBadge
                label={
                  snapshot.mode === "real"
                    ? "API-Football local"
                    : "Datos deportivos demo"
                }
                mark={snapshot.mode === "real" ? "A" : "D"}
                title={
                  snapshot.mode === "real"
                    ? "Datos deportivos de API-Football para uso local"
                    : "Los datos deportivos visibles son ficticios"
                }
              />
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
                <span className="schedule-pill">
                  Horario {nextMatch.scheduleStatus}
                </span>
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

              <Countdown
                targetDate={nextMatch.startsAt}
                initialNow={renderedAt}
              />
            </article>

            <aside className="brief-card" aria-labelledby="brief-title">
              <div className="brief-icon" aria-hidden="true">✦</div>
              <span className="eyebrow">Radar zaragocista</span>
              <h2 id="brief-title">La actualidad, en 30 segundos</h2>
              <p>{snapshot.dailyBrief}</p>
              <div className="brief-footer">
                <span>
                  {snapshot.mode === "real"
                    ? "API-Football · Uso local"
                    : "Resumen automático · Demo"}
                </span>
                <span>Actualizado {formatUpdatedAt(snapshot.generatedAt)}</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="content-section page-container" id="partidos">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Temporada {nextMatch.competition.season}
                {snapshot.mode === "demo" ? " · Demo" : ""}
              </p>
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
                <span>{snapshot.recentMatches.length} partidos</span>
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
                <span>
                  {snapshot.mode === "real" ? "Datos sincronizados" : "Demo"}
                </span>
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
                {snapshot.mode === "real"
                  ? `${snapshot.stale ? "Último snapshot válido" : "Actualizada"} ${formatUpdatedAt(
                      snapshot.syncTimes.standings ?? snapshot.generatedAt,
                    )} · ${snapshot.requestUsage.used}/${snapshot.requestUsage.limit} solicitudes estimadas hoy.`
                  : "La competición aún no ha comenzado. Posiciones ilustrativas."}
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
            <div className="section-actions">
              <span
                className={
                  newsSnapshot.stale
                    ? "sync-state sync-state-stale"
                    : "sync-state"
                }
              >
                <span aria-hidden="true" />
                {newsSnapshot.mode === "demo"
                  ? "Noticias demo"
                  : newsSnapshot.stale
                    ? "Últimos datos válidos"
                    : "Sincronización activa"}
              </span>
              <a href="/actualidad" className="text-link">
                Toda la actualidad <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          {newsSnapshot.groups.length > 0 ? (
            <div className="news-grid">
              {newsSnapshot.groups.slice(0, 3).map((group, index) => (
                <NewsCard
                  featured={index === 0}
                  group={group}
                  key={group.primary.id}
                  now={now}
                  priority={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="home-news-empty">
              <strong>Actualidad temporalmente no disponible</strong>
              <p>
                No inventamos titulares cuando las fuentes no responden.
                Volveremos a intentarlo en la próxima sincronización.
              </p>
            </div>
          )}
        </section>

        <section className="demo-notice page-container" aria-label="Aviso de datos">
          <div className="demo-notice-mark" aria-hidden="true">
            {snapshot.mode === "real" ? "A" : "D"}
          </div>
          <div>
            <strong>
              {snapshot.mode === "real"
                ? "Prototipo deportivo local"
                : "Datos deportivos en modo demostración"}
            </strong>
            <p>
              {snapshot.mode === "real"
                ? `API-Football se usa únicamente en local. Última actualización: ${formatUpdatedAt(
                    snapshot.generatedAt,
                  )}. No se muestran imágenes suministradas por la API.`
                : snapshot.sourceErrors[0] ??
                  "Los partidos, resultados y posiciones son ficticios. Actualidad utiliza fuentes RSS reales."}
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
          <span>Fase 2 · Prototipo local</span>
        </div>
      </footer>
    </div>
  );
}
