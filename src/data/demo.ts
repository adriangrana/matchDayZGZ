import type {
  Competition,
  Match,
  MatchDaySnapshot,
  NewsArticle,
  SourceReference,
  StandingEntry,
  Team,
} from "@/src/domain/models";

const fetchedAt = "2026-07-27T18:00:00.000Z";

const demoSource: SourceReference = {
  id: "demo-local",
  name: "Datos de demostración",
  url: "https://example.invalid/matchday-zgz-demo",
  fetchedAt,
};

export const realZaragoza: Team = {
  id: "real-zaragoza",
  name: "Real Zaragoza",
  shortName: "Zaragoza",
  abbreviation: "RZ",
};

const teams: Record<string, Team> = {
  zaragoza: realZaragoza,
  mirandes: {
    id: "cd-mirandes",
    name: "C.D. Mirandés",
    shortName: "Mirandés",
    abbreviation: "MIR",
  },
  eibar: {
    id: "sd-eibar",
    name: "S.D. Eibar",
    shortName: "Eibar",
    abbreviation: "EIB",
  },
  granada: {
    id: "granada-cf",
    name: "Granada C.F.",
    shortName: "Granada",
    abbreviation: "GRA",
  },
  gijon: {
    id: "sporting-gijon",
    name: "Real Sporting",
    shortName: "Sporting",
    abbreviation: "SPO",
  },
  huesca: {
    id: "sd-huesca",
    name: "S.D. Huesca",
    shortName: "Huesca",
    abbreviation: "HUE",
  },
};

const league: Competition = {
  id: "segunda-2026-27-demo",
  name: "LALIGA HYPERMOTION",
  shortName: "Liga",
  season: "2026/27 · Demo",
};

function match(
  id: string,
  startsAt: string,
  homeTeam: Team,
  awayTeam: Team,
  round: string,
  status: Match["status"] = "scheduled",
  score?: Match["score"],
): Match {
  return {
    id,
    competition: league,
    round,
    startsAt,
    scheduleStatus: id === "next" ? "provisional" : "confirmed",
    status,
    venue:
      homeTeam.id === realZaragoza.id
        ? "Ibercaja Estadio"
        : `Estadio de ${homeTeam.shortName}`,
    homeTeam,
    awayTeam,
    score,
    source: demoSource,
    updatedAt: fetchedAt,
  };
}

const nextMatch = match(
  "next",
  "2026-08-16T17:30:00.000Z",
  realZaragoza,
  teams.mirandes!,
  "Jornada 1",
);

const recentMatches = [
  match(
    "recent-1",
    "2026-07-25T18:00:00.000Z",
    teams.eibar!,
    realZaragoza,
    "Amistoso",
    "finished",
    { home: 1, away: 2 },
  ),
  match(
    "recent-2",
    "2026-07-19T17:00:00.000Z",
    realZaragoza,
    teams.huesca!,
    "Amistoso",
    "finished",
    { home: 1, away: 1 },
  ),
  match(
    "recent-3",
    "2026-07-12T18:30:00.000Z",
    teams.granada!,
    realZaragoza,
    "Amistoso",
    "finished",
    { home: 0, away: 1 },
  ),
];

const upcomingMatches = [
  nextMatch,
  match(
    "upcoming-2",
    "2026-08-23T19:00:00.000Z",
    teams.gijon!,
    realZaragoza,
    "Jornada 2",
  ),
  match(
    "upcoming-3",
    "2026-08-30T17:30:00.000Z",
    realZaragoza,
    teams.eibar!,
    "Jornada 3",
  ),
];

const standings: StandingEntry[] = [
  { position: 1, team: teams.granada!, played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
  { position: 2, team: teams.eibar!, played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
  { position: 3, team: realZaragoza, played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
  { position: 4, team: teams.gijon!, played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
  { position: 5, team: teams.mirandes!, played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
];

const news: NewsArticle[] = [
  {
    id: "news-1",
    title: "La plantilla completa una nueva sesión de pretemporada",
    summary:
      "El equipo continúa afinando su preparación con trabajo de campo y ejercicios tácticos antes del inicio liguero.",
    canonicalUrl: "https://example.invalid/noticias/pretemporada",
    publishedAt: "2026-07-27T10:20:00.000Z",
    category: "entrenamientos",
    confirmation: "oficial",
    source: demoSource,
    relatedEntityIds: ["real-zaragoza"],
  },
  {
    id: "news-2",
    title: "El cuerpo técnico perfila el plan para el primer partido",
    summary:
      "La carga física baja progresivamente mientras el grupo comienza a trabajar situaciones específicas de competición.",
    canonicalUrl: "https://example.invalid/noticias/plan-primer-partido",
    publishedAt: "2026-07-27T08:05:00.000Z",
    category: "plantilla",
    confirmation: "muy_probable",
    source: demoSource,
    relatedEntityIds: ["real-zaragoza", "cd-mirandes"],
  },
  {
    id: "news-3",
    title: "La campaña de abonados entra en su recta final",
    summary:
      "El club recuerda los últimos plazos de la campaña y prepara la atención presencial para los próximos días.",
    canonicalUrl: "https://example.invalid/noticias/abonados",
    publishedAt: "2026-07-26T17:40:00.000Z",
    category: "abonados",
    confirmation: "oficial",
    source: demoSource,
    relatedEntityIds: ["real-zaragoza"],
  },
];

export const demoSnapshot: MatchDaySnapshot = {
  nextMatch,
  recentMatches,
  upcomingMatches,
  standings,
  news,
  dailyBrief:
    "El equipo entra en una semana de carga controlada con el foco puesto en el estreno liguero. La preparación avanza sin novedades oficiales en la plantilla y la campaña de abonados afronta sus últimos días.",
  generatedAt: fetchedAt,
  freshness: "fresh",
  isDemo: true,
};

