import { Countdown } from "@/src/components/countdown";
import { DemoBadge } from "@/src/components/demo-badge";
import { Header } from "@/src/components/header";
import { HomeGroupTabs } from "@/src/components/home-group-tabs";
import { NewsCard } from "@/src/components/news-card";
import { SiteFooter } from "@/src/components/site-footer";
import { TeamMark } from "@/src/components/team-mark";
import type { Match } from "@/src/domain/models";
import { getNewsSnapshot } from "@/src/services/news-service";
import { getSportsSnapshot } from "@/src/services/sports-service";
import {
  isConfirmedKickoff,
  kickoffLabel,
  madridDateKey,
  matchDateLabel,
  scheduleLabel,
  venueLabel,
} from "@/src/services/sports-presenter";

export const dynamic = "force-dynamic";

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
        <span>{matchDateLabel(match, true)}</span>
        <small>{match.round}</small>
      </div>
      <TeamMark team={rival} size="small" />
      <div className="match-team">
        <strong>{rival.shortName}</strong>
        <span>{venueSide}</span>
      </div>
      {upcoming ? (
        <span className="match-time">{kickoffLabel(match)}</span>
      ) : (
        <strong className="match-score">
          {match.score?.home ?? "–"} <span>:</span> {match.score?.away ?? "–"}
        </strong>
      )}
    </article>
  );
}

function GroupMatchRow({ match }: { match: Match }) {
  const finished = match.status === "finished";
  return (
    <article className="match-row group-match-row">
      <div className="match-date">
        <span>{matchDateLabel(match, true)}</span>
        <small>{match.round}</small>
      </div>
      <div className="group-match-teams">
        <strong>{match.homeTeam.shortName}</strong>
        <span>{finished ? "" : "vs"}</span>
        <strong>{match.awayTeam.shortName}</strong>
      </div>
      {finished ? (
        <strong className="match-score">
          {match.score?.home ?? "–"} <span>:</span> {match.score?.away ?? "–"}
        </strong>
      ) : (
        <span className="match-time">{kickoffLabel(match)}</span>
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
  const todayDate = madridDateKey(now);

  return (
    <div className="site-shell">
      <Header active="home" />
      <main>
        <section className="hero-section page-container" id="inicio">
          <div className="hero-heading">
            <div>
              <DemoBadge
                label={
                  snapshot.mode === "real"
                    ? "Fuentes públicas"
                    : "Datos deportivos demo"
                }
                mark={snapshot.mode === "real" ? "F" : "D"}
                title={
                  snapshot.mode === "real"
                    ? "Calendario oficial RFEF para uso local"
                    : "Los datos deportivos visibles son ficticios"
                }
              />
              <p className="eyebrow">Todo el zaragocismo, en un solo lugar</p>
              <h1 className="hero-title">
                <span>El partido</span>
                <strong>empieza aquí</strong>
              </h1>
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
                  {scheduleLabel(nextMatch)}
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
                  <small>{kickoffLabel(nextMatch)}</small>
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
                    <strong>{matchDateLabel(nextMatch)}</strong>
                    {kickoffLabel(nextMatch)}
                  </span>
                </div>
                <div>
                  <span className="detail-icon" aria-hidden="true">⌖</span>
                  <span>
                    <strong>{venueLabel(nextMatch)}</strong>
                    {zaragozaIsHome ? "Local" : "Visitante"}
                  </span>
                </div>
              </div>

              {isConfirmedKickoff(nextMatch) ? (
                <Countdown
                  targetDate={nextMatch.startsAt}
                  initialNow={renderedAt}
                />
              ) : (
                <div
                  className="countdown countdown-pending"
                  aria-label="Horario pendiente de confirmación"
                >
                  <span className="countdown-label">Calendario RFEF</span>
                  <strong>
                    {nextMatch.venue
                      ? "Horario por confirmar"
                      : "Horario y estadio por confirmar"}
                  </strong>
                </div>
              )}
            </article>

            <aside className="brief-card" aria-labelledby="brief-title">
              <div className="brief-icon" aria-hidden="true">✦</div>
              <span className="eyebrow">Radar zaragocista</span>
              <h2 id="brief-title">La actualidad, en 30 segundos</h2>
              <p>{snapshot.dailyBrief}</p>
              <div className="brief-footer">
                <span>
                  {snapshot.mode === "real"
                    ? "RFEF · Uso local"
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
            <a href="/partidos" className="text-link">
              Ver calendario <span aria-hidden="true">→</span>
            </a>
          </div>

          <HomeGroupTabs
            groupTwoMatches={[
              ...snapshot.groupTwoRecentMatches,
              ...snapshot.groupTwoUpcomingMatches,
            ]}
            groupTwoStandings={snapshot.groupTwoFullStandings}
            groupTwoGeneratedAt={snapshot.generatedAt}
            groupOneMatches={[
              ...snapshot.groupOneRecentMatches,
              ...snapshot.groupOneUpcomingMatches,
            ]}
            groupOneStandings={snapshot.groupOneStandings}
            groupOneGeneratedAt={snapshot.groupOneGeneratedAt}
            todayDate={todayDate}
          />

          <div className="dashboard-grid legacy-zaragoza-grid" aria-hidden="true">
            <a
              className={
                snapshot.recentMatches.length > 0
                  ? "panel panel-link-card results-panel"
                  : "panel panel-link-card results-panel results-panel-empty"
              }
              href="/partidos"
            >
              <div className="panel-heading">
                <h3>Últimos resultados</h3>
                <span>
                  {snapshot.recentMatches.length > 0
                    ? `${snapshot.recentMatches.length} partidos`
                    : "Temporada 2026/27"}
                </span>
              </div>
              <div className="match-list">
                {snapshot.recentMatches.length > 0 ? (
                  snapshot.recentMatches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))
                ) : (
                  <div className="results-empty-state">
                    <span className="results-empty-icon" aria-hidden="true" />
                    <div>
                      <strong>Aún no hay resultados oficiales</strong>
                      <p>La temporada 2026/27 todavía no ha comenzado.</p>
                    </div>
                  </div>
                )}
              </div>
            </a>

            <a className="panel panel-link-card fixtures-panel" href="/partidos">
              <div className="panel-heading">
                <h3>Próximos encuentros</h3>
                <span>Horario peninsular</span>
              </div>
              <div className="match-list">
                {snapshot.upcomingMatches.map((match) => (
                  <MatchRow key={match.id} match={match} upcoming />
                ))}
              </div>
            </a>

            <a className="panel panel-link-card standing-panel" href="/clasificacion">
              <div className="panel-heading">
                <h3>Clasificación</h3>
                <span>
                  {snapshot.mode === "real" ? "Datos sincronizados" : "Demo"}
                </span>
              </div>
              {snapshot.standingsStatus === "complete" ? (
                <>
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
                        <span>{entry.position || "—"}</span>
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
                </>
              ) : (
                <div className="standings-empty">
                  <strong>La temporada todavía no ha comenzado</strong>
                  <p>Clasificación pendiente de resultados completos.</p>
                </div>
              )}
              <p className="standing-note">
                {snapshot.mode === "real"
                  ? `${snapshot.stale ? "Último snapshot válido" : "Actualizada"} ${formatUpdatedAt(
                      snapshot.syncTimes.standings ?? snapshot.generatedAt,
                    )} · ${snapshot.requestUsage.used}/${snapshot.requestUsage.limit} solicitudes estimadas hoy.`
                  : "La temporada todavía no ha comenzado."}
              </p>
              <span className="panel-full-link">
                Ver clasificación completa <span aria-hidden="true">→</span>
              </span>
            </a>

            <section className="panel group-one-panel" aria-labelledby="group-one-title">
              <div className="panel-heading">
                <h3 id="group-one-title">Primera Federación · Grupo I</h3>
                <span>Calendario y tabla</span>
              </div>
              <div className="group-one-columns">
                <div>
                  <p className="panel-kicker">Próximos encuentros</p>
                  {snapshot.groupOneUpcomingMatches.length > 0 ? (
                    <div className="match-list">
                      {snapshot.groupOneUpcomingMatches.map((match) => (
                        <GroupMatchRow key={match.id} match={match} />
                      ))}
                    </div>
                  ) : (
                    <p className="group-one-empty">Calendario pendiente de sincronización.</p>
                  )}
                  <p className="panel-kicker">Últimos resultados</p>
                  {snapshot.groupOneRecentMatches.length > 0 ? (
                    <div className="match-list group-one-results-list">
                      {snapshot.groupOneRecentMatches.map((match) => (
                        <GroupMatchRow key={match.id} match={match} />
                      ))}
                    </div>
                  ) : (
                    <p className="group-one-empty">Aún no hay resultados oficiales.</p>
                  )}
                </div>
                <div>
                  <p className="panel-kicker">Clasificación</p>
                  {snapshot.groupOneStandings.length > 0 ? (
                    <div className="group-one-standings">
                      {snapshot.groupOneStandings.slice(0, 5).map((entry) => (
                        <div className="standing-row" key={entry.team.id}>
                          <span>{entry.position || "—"}</span>
                          <span className="standing-team"><TeamMark team={entry.team} size="tiny" />{entry.team.shortName}</span>
                          <strong>{entry.points}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="group-one-empty">Clasificación pendiente de resultados.</p>
                  )}
                </div>
              </div>
              <div className="group-one-footer">
                <span>Actualizado {formatUpdatedAt(snapshot.groupOneGeneratedAt)}</span>
                <a href="/clasificacion" className="panel-full-link">Ver Grupo I completo <span aria-hidden="true">→</span></a>
              </div>
            </section>
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

      </main>

      <SiteFooter
        generatedAt={snapshot.generatedAt}
        sourceLabel={
          snapshot.mode === "real"
            ? "Calendario oficial RFEF"
            : "Datos deportivos de demostración"
        }
      />
    </div>
  );
}
