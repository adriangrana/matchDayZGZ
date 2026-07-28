import type { Metadata } from "next";
import { Header } from "@/src/components/header";
import { TeamMark } from "@/src/components/team-mark";
import { getSportsCatalogSnapshot } from "@/src/services/sports-catalog";

export const metadata: Metadata = {
  title: "Clasificación 2026/27 · MatchDay ZGZ",
  description:
    "Clasificación calculada del Grupo II de Primera Federación con estado de completitud de resultados.",
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

export default function StandingsPage() {
  const snapshot = getSportsCatalogSnapshot();
  const isPreseason = snapshot.standingsStatus === "preseason";

  return (
    <div className="site-shell">
      <Header active="standings" />
      <main className="sports-page page-container">
        <header className="sports-page-header">
          <p className="eyebrow">
            Primera Federación · Grupo II · {snapshot.season}
          </p>
          <h1>Clasificación</h1>
          <p>
            Tabla calculada únicamente con resultados finales disponibles. No
            se aplican zonas de ascenso, playoff o descenso hasta confirmar la
            normativa de la temporada.
          </p>
          <div className="sports-source-note">
            <span>
              Fuente: cálculo local sobre resultados oficiales disponibles
            </span>
            <span>Última actualización: {formattedSync(snapshot.generatedAt)}</span>
          </div>
        </header>

        <aside className="standings-warning" role="status">
          <strong>
            {isPreseason
              ? "La temporada todavía no ha comenzado"
              : snapshot.standingsStatus === "complete"
                ? "Clasificación calculada con todos los resultados"
                : "Clasificación calculada y provisional"}
          </strong>
          <p>
            {snapshot.standingsStatus === "complete"
              ? "La tabla contiene los resultados completos del grupo, pero no se presenta como clasificación oficial publicada."
              : `Clasificación pendiente de resultados completos. Faltan ${snapshot.missingGroupResults} resultados del Grupo II.`}
          </p>
        </aside>

        <div className="standings-table-wrap">
          <table className="standings-table">
            <thead>
              <tr>
                <th scope="col">Pos</th>
                <th scope="col">Equipo</th>
                <th scope="col">PJ</th>
                <th scope="col">PG</th>
                <th scope="col">PE</th>
                <th scope="col">PP</th>
                <th scope="col">GF</th>
                <th scope="col">GC</th>
                <th scope="col">DG</th>
                <th scope="col">PTS</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.standings.map((entry) => (
                <tr
                  className={
                    entry.team.id === "real-zaragoza"
                      ? "standings-team-highlight"
                      : undefined
                  }
                  key={entry.team.id}
                >
                  <td>{isPreseason ? "—" : entry.position || "—"}</td>
                  <th scope="row">
                    <TeamMark team={entry.team} size="tiny" />
                    <span>{entry.team.name}</span>
                  </th>
                  <td>{entry.played}</td>
                  <td>{entry.won}</td>
                  <td>{entry.drawn}</td>
                  <td>{entry.lost}</td>
                  <td>{entry.goalsFor ?? 0}</td>
                  <td>{entry.goalsAgainst ?? 0}</td>
                  <td>{entry.goalDifference}</td>
                  <td className="standings-points">{entry.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
