import type { Metadata } from "next";
import { Header } from "@/src/components/header";
import { StandingsTabs } from "@/src/components/standings-tabs";
import { getPersistedSportsCatalogCollection } from "@/src/services/persisted-sports-catalog";

// <TeamMark /> y “Clasificación pendiente de resultados completos” se renderizan dentro de las pestañas.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clasificación 2026/27 · MatchDay ZGZ",
  description:
    "Clasificaciones calculadas de los Grupos I y II de Primera Federación.",
};

function formattedSync(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(value)).replace(".", "");
}

export default async function StandingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ grupo?: string | string[] }>;
}) {
  const params = await searchParams;
  const groupParam = Array.isArray(params?.grupo) ? params.grupo[0] : params?.grupo;
  const initialGroup = groupParam === "2" ? "group-2" : "group-1";
  const { groupTwo, groupOne } = await getPersistedSportsCatalogCollection();

  return (
    <div className="site-shell">
      <Header active="standings" />
      <main className="sports-page page-container">
        <header className="sports-page-header">
          <p className="eyebrow">Primera Federación · 2026/27</p>
          <h1 className="page-title">Clasificación</h1>
          <p>
            Selecciona un grupo para consultar su tabla y el estado de los
            resultados disponibles.
          </p>
          <p className="standings-page-note">
            Si todavía no ha terminado una jornada, se mostrará “Clasificación
            pendiente de resultados completos”.
          </p>
          <div className="sports-source-note">
            <span>Fuente: cálculo local sobre resultados oficiales disponibles</span>
            <span>Actualizado · Grupo II {formattedSync(groupTwo.generatedAt)} · Grupo I {formattedSync(groupOne.generatedAt)}</span>
          </div>
        </header>

        <StandingsTabs
          groupTwo={groupTwo}
          groupOne={groupOne}
          initialGroup={initialGroup}
        />
      </main>
    </div>
  );
}
