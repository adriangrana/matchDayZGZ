import {
  ResponsibleHttpClient,
  responseText,
} from "../src/services/responsible-http-client";
import { isPathAllowedByRobots } from "../src/services/robots-policy";

const DAY_MS = 24 * 60 * 60 * 1_000;
const http = new ResponsibleHttpClient();
const sources = [
  {
    id: "rfef",
    robots: "https://rfef.es/robots.txt",
    paths: [
      "/sites/default/files/2026-06/Primera_Federacion_Grupo_II.pdf",
    ],
    terms: "allowed-for-local-factual-prototype",
  },
  {
    id: "as",
    robots: "https://as.com/robots.txt",
    paths: [
      "/resultados/futbol/primera_rfef/",
      "/resultados/futbol/primera_rfef/jornada/",
      "/resultados/futbol/primera_rfef/clasificacion/",
      "/resultados/futbol/primera_rfef/calendario/",
    ],
    terms: "blocked-by-terms",
  },
  {
    id: "real-zaragoza",
    robots: "https://www.realzaragoza.com/robots.txt",
    paths: ["/partidos", "/agenda", "/noticias"],
    terms: "allowed-for-personal-private-use",
  },
] as const;

const results = [];
for (const source of sources) {
  try {
    const response = await http.get(source.robots, {
      maxAgeMs: DAY_MS,
      accept: "text/plain",
      timeoutMs: 8_000,
      retries: 1,
    });
    const robots = responseText(response);
    results.push({
      id: source.id,
      robotsStatus: response.status,
      cache: response.cache,
      paths: source.paths.map((path) => ({
        path,
        allowedByRobots: isPathAllowedByRobots(robots, path),
      })),
      terms: source.terms,
      usable:
        source.terms !== "blocked-by-terms" &&
        source.paths.every((path) => isPathAllowedByRobots(robots, path)),
    });
  } catch (error) {
    results.push({
      id: source.id,
      usable: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      userAgent:
        "MatchDay-ZGZ/0.4 (local personal prototype; low-volume sports facts fetcher)",
      totalRequests: http.requestCount,
      sources: results,
    },
    null,
    2,
  ),
);

