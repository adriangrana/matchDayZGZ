import type { Metadata } from "next";
import { Header } from "@/src/components/header";
import { MatchesExplorer } from "@/src/components/matches-explorer";
import { getPersistedSportsCatalogSnapshot } from "@/src/services/persisted-sports-catalog";
import { isConfirmedKickoff, matchDateLabel } from "@/src/services/sports-presenter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partidos 2026/27 · MatchDay ZGZ",
  description:
    "Calendario completo del Real Zaragoza con fechas base, horarios confirmados y resultados disponibles.",
};

function formattedSync(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export default async function MatchesPage() {
  const snapshot = await getPersistedSportsCatalogSnapshot();
  const homeMatches = snapshot.matches.filter(
    (match) => match.homeTeam.id === "real-zaragoza",
  ).length;
  const awayMatches = snapshot.matches.length - homeMatches;
  const confirmedMatches = snapshot.matches.filter(isConfirmedKickoff).length;
  const nextMatch = snapshot.matches.find(
    (match) => match.status !== "finished",
  );
  const nextRival = nextMatch
    ? nextMatch.homeTeam.id === "real-zaragoza"
      ? nextMatch.awayTeam
      : nextMatch.homeTeam
    : undefined;

  return (
    <div className="site-shell">
      <Header active="matches" />
      <main className="sports-page page-container">
        <header className="sports-page-header">
          <div className="sports-page-intro">
            <div>
              <p className="eyebrow">Temporada {snapshot.season}</p>
              <h1 className="page-title">Partidos</h1>
            </div>
            <p>
              Los 38 encuentros de Primera Federación del Real Zaragoza. Las
              fechas publicadas por la RFEF son bases de jornada hasta que una
              fuente oficial confirme el día y el horario.
            </p>
          </div>
          <div className="sports-source-note">
            <span>Fuente: calendario oficial RFEF</span>
            <span>Última sincronización: {formattedSync(snapshot.generatedAt)}</span>
            {snapshot.stale ? (
              <strong>Datos desactualizados · mostrando el último snapshot válido</strong>
            ) : null}
          </div>
          <dl className="season-summary" aria-label="Resumen de la temporada">
            <div>
              <dt>Partidos de liga</dt>
              <dd>{snapshot.matches.length}</dd>
            </div>
            <div>
              <dt>Como local</dt>
              <dd>{homeMatches}</dd>
            </div>
            <div>
              <dt>Como visitante</dt>
              <dd>{awayMatches}</dd>
            </div>
            <div className="season-summary-next">
              <dt>Próximo encuentro</dt>
              <dd>
                {nextRival && nextMatch
                  ? `${nextRival.shortName} · ${matchDateLabel(nextMatch, true)}`
                  : "Por confirmar"}
              </dd>
            </div>
            <div>
              <dt>Horarios confirmados</dt>
              <dd>{confirmedMatches}</dd>
            </div>
            <div>
              <dt>Horarios pendientes</dt>
              <dd>{snapshot.matches.length - confirmedMatches}</dd>
            </div>
          </dl>
        </header>

        <MatchesExplorer
          generatedAt={snapshot.generatedAt}
          matches={snapshot.matches}
          stale={snapshot.stale}
        />
      </main>
    </div>
  );
}
