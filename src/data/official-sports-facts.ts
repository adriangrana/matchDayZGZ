import type { OfficialMatchPatch } from "@/src/providers/free-sports-types";

/**
 * Últimos hechos mínimos confirmados por el club y guardados como parte del
 * snapshot local. No contiene imágenes, escudos ni contenido editorial.
 */
export const officialSportsFacts: OfficialMatchPatch[] = [
  {
    round: 1,
    homeTeamName: "Gimnàstic de Tarragona",
    awayTeamName: "Real Zaragoza",
    kickoffStatus: "unknown",
    venue: "Nou Estadi Costa Daurada",
    status: "scheduled",
    source: {
      id: "real-zaragoza-official",
      name: "Real Zaragoza oficial",
      url: "https://www.realzaragoza.com/partidos",
      fetchedAt: "2026-07-27T22:42:11.063Z",
      isOfficial: true,
    },
  },
];
