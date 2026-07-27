import {
  groupTwoTeamNames,
  normalizeTeamName,
  requireGroupTwoTeam,
} from "@/src/data/primera-federacion-teams";
import type {
  NormalizedGroupMatch,
  SourceDiagnostic,
} from "@/src/providers/free-sports-types";
import {
  ResponsibleHttpClient,
  responseText,
} from "@/src/services/responsible-http-client";
import { isPathAllowedByRobots } from "@/src/services/robots-policy";

export const RFEF_CALENDAR_URL =
  "https://rfef.es/sites/default/files/2026-06/Primera_Federacion_Grupo_II.pdf";
const RFEF_ROBOTS_URL = "https://rfef.es/robots.txt";
const DAY_MS = 24 * 60 * 60 * 1_000;

export interface RfefCalendarResult {
  matches: NormalizedGroupMatch[];
  zaragozaMatches: NormalizedGroupMatch[];
  diagnostic: SourceDiagnostic;
}

function dateParts(value: string): {
  isoDate: string;
  startsAt: string;
} {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) {
    throw new Error(`Fecha RFEF no válida: ${value}`);
  }
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    isoDate,
    startsAt: `${isoDate}T12:00:00+02:00`,
  };
}

const normalizedNames = groupTwoTeamNames
  .map((name) => ({ name, comparable: normalizeTeamName(name) }))
  .sort((first, second) => second.comparable.length - first.comparable.length);

function parseFixtureLine(
  line: string,
): { home: string; away: string } | undefined {
  const comparableLine = normalizeTeamName(line);
  for (const home of normalizedNames) {
    if (!comparableLine.startsWith(`${home.comparable} `)) continue;
    const awayText = comparableLine.slice(home.comparable.length).trim();
    const away = normalizedNames.find(
      (candidate) => candidate.comparable === awayText,
    );
    if (away) return { home: home.name, away: away.name };
  }
  return undefined;
}

export function parseRfefCalendarLines(
  lines: string[],
  fetchedAt = new Date().toISOString(),
): NormalizedGroupMatch[] {
  const matches: NormalizedGroupMatch[] = [];
  let currentRound:
    | { number: number; dateBase: string; startsAt: string; matches: number }
    | undefined;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const round = line.match(
      /Jornada\s+(\d{1,2})\s*\((\d{2}\/\d{2}\/\d{4})\)/i,
    );
    if (round) {
      const number = Number(round[1]);
      const date = dateParts(round[2]!);
      currentRound = {
        number,
        dateBase: date.isoDate,
        startsAt: date.startsAt,
        matches: 0,
      };
      continue;
    }

    if (!currentRound || currentRound.matches >= 10) continue;
    const teams = parseFixtureLine(line);
    if (!teams) continue;
    currentRound.matches += 1;
    const homeTeam = requireGroupTwoTeam(teams.home);
    const awayTeam = requireGroupTwoTeam(teams.away);
    matches.push({
      id: `rfef-2026-27-j${currentRound.number}-${homeTeam.id}-${awayTeam.id}`,
      round: currentRound.number,
      roundLabel: `Jornada ${currentRound.number}`,
      dateBase: currentRound.dateBase,
      startsAt: currentRound.startsAt,
      kickoffStatus: "unknown",
      homeTeam,
      awayTeam,
      status: "scheduled",
      sources: [
        {
          id: "rfef-calendar-pdf",
          name: "Calendario oficial RFEF",
          url: RFEF_CALENDAR_URL,
          fetchedAt,
          isOfficial: true,
        },
      ],
      updatedAt: fetchedAt,
    });
  }

  validateRfefCalendar(matches);
  return matches;
}

export function validateRfefCalendar(matches: NormalizedGroupMatch[]): void {
  if (matches.length !== 380) {
    throw new Error(
      `Calendario RFEF incompleto: ${matches.length}/380 partidos`,
    );
  }
  const rounds = new Map<number, number>();
  const zaragozaRounds = new Set<number>();
  const teams = new Set<string>();
  for (const match of matches) {
    rounds.set(match.round, (rounds.get(match.round) ?? 0) + 1);
    teams.add(match.homeTeam.id);
    teams.add(match.awayTeam.id);
    if (
      match.homeTeam.id === "real-zaragoza" ||
      match.awayTeam.id === "real-zaragoza"
    ) {
      if (zaragozaRounds.has(match.round)) {
        throw new Error(
          `El Real Zaragoza aparece más de una vez en la jornada ${match.round}`,
        );
      }
      zaragozaRounds.add(match.round);
    }
  }
  if (
    rounds.size !== 38 ||
    [...rounds.values()].some((matchCount) => matchCount !== 10)
  ) {
    throw new Error("El calendario RFEF no contiene 38 jornadas completas");
  }
  if (teams.size !== 20) {
    throw new Error(`El calendario RFEF contiene ${teams.size}/20 equipos`);
  }
  if (zaragozaRounds.size !== 38) {
    throw new Error(
      `El calendario RFEF contiene ${zaragozaRounds.size}/38 partidos del Real Zaragoza`,
    );
  }
}

async function extractPdfLines(body: Uint8Array): Promise<string[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({
    data: body,
    useWorkerFetch: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] * 2) / 2;
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4], text: item.str.trim() });
      rows.set(y, row);
    }
    [...rows.entries()]
      .sort((first, second) => second[0] - first[0])
      .forEach(([, items]) => {
        lines.push(
          items
            .sort((first, second) => first.x - second.x)
            .map((item) => item.text)
            .join(" "),
        );
      });
  }

  return lines;
}

export class RfefPdfCalendarProvider {
  readonly id = "rfef-calendar-pdf";

  constructor(private readonly http: ResponsibleHttpClient) {}

  async getCalendar(options: {
    now?: Date;
    force?: boolean;
  } = {}): Promise<RfefCalendarResult> {
    const now = options.now ?? new Date();
    const robots = await this.http.get(RFEF_ROBOTS_URL, {
      maxAgeMs: DAY_MS,
      accept: "text/plain",
      timeoutMs: 8_000,
      retries: 1,
      now,
      force: options.force,
    });
    const pdfPath = new URL(RFEF_CALENDAR_URL).pathname;
    if (!isPathAllowedByRobots(responseText(robots), pdfPath)) {
      throw new Error("robots.txt de RFEF bloquea el calendario solicitado");
    }

    const response = await this.http.get(RFEF_CALENDAR_URL, {
      maxAgeMs: DAY_MS,
      accept: "application/pdf",
      timeoutMs: 12_000,
      retries: 1,
      now,
      force: options.force,
    });
    if (
      response.contentType &&
      !response.contentType.toLowerCase().includes("pdf")
    ) {
      throw new Error(
        `La RFEF devolvió un tipo inesperado: ${response.contentType}`,
      );
    }
    const matches = parseRfefCalendarLines(
      await extractPdfLines(response.body),
      response.fetchedAt,
    );
    const zaragozaMatches = matches.filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    );

    return {
      matches,
      zaragozaMatches,
      diagnostic: {
        id: this.id,
        name: "Calendario oficial RFEF",
        url: RFEF_CALENDAR_URL,
        policyStatus: "allowed",
        httpStatus: response.status,
        durationMs: robots.durationMs + response.durationMs,
        cache: response.cache,
        extracted: { matches: matches.length, standings: 0 },
        placeholderKickoffsDiscarded: 0,
        checkedAt: response.checkedAt,
        etag: response.etag,
        lastModified: response.lastModified,
        hash: response.hash,
        error: response.error,
      },
    };
  }
}
