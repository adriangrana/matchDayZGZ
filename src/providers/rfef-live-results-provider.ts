import {
  groupOneTeamAliases,
  groupTwoTeamAliases,
  normalizeTeamName,
} from "@/src/data/primera-federacion-teams";
import type { SourceReference, Team } from "@/src/domain/models";
import type {
  NormalizedGroupMatch,
  OfficialMatchPatch,
  SourceDiagnostic,
} from "@/src/providers/free-sports-types";
import {
  ResponsibleHttpClient,
  responseText,
} from "@/src/services/responsible-http-client";

export const RFEF_LIVE_RESULTS_URL =
  "https://marcadores.rfef.es/pnfg/?accion=1";
export const SOFASCORE_LIVE_RESULTS_URL =
  "https://api.sofascore.com/api/v1/sport/football/events/live";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152 Safari/537.36";
const TWO_MINUTES_MS = 2 * 60 * 1_000;
const FINISHED_AFTER_MS = 135 * 60 * 1_000;

interface ResultsFetch {
  patches: OfficialMatchPatch[];
  diagnostics: SourceDiagnostic[];
}

interface SofascoreTeam {
  name?: string;
  shortName?: string;
}

interface SofascoreScore {
  current?: number;
  display?: number;
  normaltime?: number;
}

interface SofascoreEvent {
  startTimestamp?: number;
  status?: { type?: string; description?: string };
  homeTeam?: SofascoreTeam;
  awayTeam?: SofascoreTeam;
  homeScore?: SofascoreScore;
  awayScore?: SofascoreScore;
}

interface SofascoreLivePayload {
  events?: SofascoreEvent[];
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    aacute: "á",
    eacute: "é",
    iacute: "í",
    oacute: "ó",
    uacute: "ú",
    Aacute: "Á",
    Eacute: "É",
    Iacute: "Í",
    Oacute: "Ó",
    Uacute: "Ú",
    ntilde: "ñ",
    Ntilde: "Ñ",
    uuml: "ü",
    Uuml: "Ü",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const value = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
    }
    if (code.startsWith("#")) {
      const value = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
    }
    return named[code] ?? named[code.toLowerCase()] ?? entity;
  });
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<(?:br|hr)\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:tr|li|article|section|p|div)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function htmlBlocks(html: string): string[] {
  const tableRows = [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)]
    .map((match) => stripHtml(match[0]))
    .filter(Boolean);
  const lines = stripHtml(html)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return [...tableRows, ...lines];
}

function aliasesFor(team: Team): string[] {
  const aliases = [
    team.name,
    team.shortName,
    ...(groupOneTeamAliases[team.id] ?? []),
    ...(groupTwoTeamAliases[team.id] ?? []),
  ]
    .map(normalizeTeamName)
    .filter(Boolean);
  return [...new Set(aliases)].sort((a, b) => b.length - a.length);
}

function matchesAlias(value: string | undefined, team: Team): boolean {
  if (!value) return false;
  const normalized = normalizeTeamName(value);
  return aliasesFor(team).some(
    (alias) =>
      normalized === alias ||
      normalized.includes(alias) ||
      alias.includes(normalized),
  );
}

function matchingBlock(
  blocks: string[],
  match: NormalizedGroupMatch,
): string | undefined {
  const homeAliases = aliasesFor(match.homeTeam);
  const awayAliases = aliasesFor(match.awayTeam);
  return blocks.find((block) => {
    const normalized = normalizeTeamName(block);
    return (
      homeAliases.some((alias) => normalized.includes(alias)) &&
      awayAliases.some((alias) => normalized.includes(alias))
    );
  });
}

function extractScore(block: string): { home: number; away: number } | undefined {
  const score = block.match(/(?:^|\s)(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s|$)/);
  if (!score) return undefined;
  return { home: Number(score[1]), away: Number(score[2]) };
}

const spanishMonths: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function madridDateTimeIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/Madrid",
    })
      .formatToParts(new Date(guess))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const localGuess = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return new Date(guess - (localGuess - guess)).toISOString();
}

function extractArticleKickoff(
  block: string,
  match: NormalizedGroupMatch,
): string | undefined {
  const normalized = stripHtml(block);
  const date = normalized.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i,
  );
  const time = normalized.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!date || !time) return undefined;
  const month = spanishMonths[normalizeTeamName(date[2]!)];
  const year = Number(match.dateBase.slice(0, 4));
  if (!month || !year) return undefined;
  return madridDateTimeIso(
    year,
    month,
    Number(date[1]),
    Number(time[1]),
    Number(time[2]),
  );
}

export function parseRfefRoundArticleHtml(
  html: string,
  matches: NormalizedGroupMatch[],
  source: SourceReference,
): OfficialMatchPatch[] {
  const rows = [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(
    (match) => match[0],
  );
  const patches: OfficialMatchPatch[] = [];

  for (const match of matches) {
    const block = matchingBlock(rows.map(stripHtml), match);
    if (!block) continue;
    const startsAt = extractArticleKickoff(block, match);
    if (!startsAt) continue;
    const score = extractScore(block);
    patches.push({
      round: match.round,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      startsAt,
      kickoffStatus: "confirmed",
      score,
      status: score ? "finished" : undefined,
      source,
    });
  }

  return patches;
}

export function rfefRoundArticleUrl(round: number): string {
  return `https://rfef.es/es/noticias/resumenes-vive-la-jornada-${round}-de-primera-federacion`;
}

export function selectRfefArticleRound(
  matches: NormalizedGroupMatch[],
  now = new Date(),
): number | undefined {
  const rounds = new Map<number, number>();
  for (const match of matches) {
    if (match.round <= 0 || rounds.has(match.round)) continue;
    const timestamp = new Date(`${match.dateBase}T12:00:00Z`).getTime();
    if (Number.isFinite(timestamp)) rounds.set(match.round, timestamp);
  }
  return [...rounds.entries()].sort((first, second) => {
    const firstDistance = Math.abs(first[1] - now.getTime());
    const secondDistance = Math.abs(second[1] - now.getTime());
    return firstDistance - secondDistance || first[0] - second[0];
  })[0]?.[0];
}

function inferStatus(
  block: string,
  match: NormalizedGroupMatch,
  now: Date,
  finalOnly: boolean,
): "live" | "finished" {
  if (finalOnly) return "finished";
  const normalized = normalizeTeamName(block);
  if (/\b(final|finalizado|finalizada|terminado|terminada|acta cerrada)\b/.test(normalized)) {
    return "finished";
  }
  if (
    /\b(en juego|directo|descanso|primera parte|segunda parte)\b/.test(normalized) ||
    /\b\d{1,3}\s*(?:min|minuto)\b/.test(normalized) ||
    /\b\d{1,3}'/.test(block)
  ) {
    return "live";
  }

  const elapsed = now.getTime() - new Date(match.startsAt).getTime();
  return elapsed >= FINISHED_AFTER_MS ? "finished" : "live";
}

export function parseRfefResultsHtml(
  html: string,
  matches: NormalizedGroupMatch[],
  source: SourceReference,
  options: { now?: Date; finalOnly?: boolean } = {},
): OfficialMatchPatch[] {
  const now = options.now ?? new Date();
  const blocks = htmlBlocks(html);
  const patches: OfficialMatchPatch[] = [];

  for (const match of matches) {
    const block = matchingBlock(blocks, match);
    if (!block) continue;
    const score = extractScore(block);
    if (!score) continue;
    patches.push({
      round: match.round,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      startsAt: match.startsAt,
      kickoffStatus: "confirmed",
      score,
      status: inferStatus(block, match, now, options.finalOnly ?? false),
      source,
    });
  }

  return patches;
}

function numericScore(score: SofascoreScore | undefined): number | undefined {
  const value = score?.current ?? score?.display ?? score?.normaltime;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function parseSofascoreLivePayload(
  payload: SofascoreLivePayload,
  matches: NormalizedGroupMatch[],
  source: SourceReference,
): OfficialMatchPatch[] {
  const patches: OfficialMatchPatch[] = [];
  for (const event of payload.events ?? []) {
    const type = event.status?.type?.toLowerCase();
    const status =
      type === "inprogress"
        ? "live"
        : type === "finished"
          ? "finished"
          : type === "postponed" || type === "canceled" || type === "cancelled"
            ? "postponed"
            : undefined;
    if (!status) continue;

    const match = matches.find(
      (candidate) =>
        matchesAlias(event.homeTeam?.name ?? event.homeTeam?.shortName, candidate.homeTeam) &&
        matchesAlias(event.awayTeam?.name ?? event.awayTeam?.shortName, candidate.awayTeam),
    );
    if (!match) continue;

    const home = numericScore(event.homeScore);
    const away = numericScore(event.awayScore);
    const score =
      home !== undefined && away !== undefined ? { home, away } : undefined;
    if ((status === "live" || status === "finished") && !score) continue;

    patches.push({
      round: match.round,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      startsAt:
        typeof event.startTimestamp === "number"
          ? new Date(event.startTimestamp * 1_000).toISOString()
          : match.startsAt,
      kickoffStatus: "confirmed",
      score,
      status,
      source,
    });
  }
  return patches;
}

function cookieFrom(response: Response): string | undefined {
  const setCookie = response.headers.get("set-cookie");
  return setCookie?.match(/JSESSIONID=([^;]+)/i)?.[1];
}

function absoluteLocation(response: Response, currentUrl: string): string | undefined {
  const location = response.headers.get("location");
  return location ? new URL(location, currentUrl).toString() : undefined;
}

function browserHeaders(cookie?: string): HeadersInit {
  return {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "user-agent": BROWSER_USER_AGENT,
    referer: "https://rfef.es/",
    ...(cookie ? { cookie: `JSESSIONID=${cookie}` } : {}),
  };
}

async function responseHtml(response: Response): Promise<string> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const encoding = contentType.includes("8859") ? "windows-1252" : "utf-8";
  return new TextDecoder(encoding).decode(bytes);
}

async function fetchRfefLiveHtml(): Promise<{ html: string; status: number }> {
  let currentUrl = RFEF_LIVE_RESULTS_URL;
  let cookie: string | undefined;

  for (let redirect = 0; redirect < 3; redirect += 1) {
    const response = await fetch(currentUrl, {
      headers: browserHeaders(cookie),
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    cookie = cookieFrom(response) ?? cookie;
    const next = absoluteLocation(response, currentUrl);
    if (!next) break;
    if (next.includes("NLogin?NSess=1") && cookie) break;
    currentUrl = next;
  }

  if (!cookie) {
    throw new Error("Marcadores RFEF no entregó una sesión pública JSESSIONID");
  }

  const response = await fetch(RFEF_LIVE_RESULTS_URL, {
    headers: browserHeaders(cookie),
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  const html = await responseHtml(response);
  if (!response.ok || response.url.includes("NLogin") || html.length < 100) {
    throw new Error(
      `Marcadores RFEF no devolvió la portada pública de resultados (${response.status})`,
    );
  }
  return { html, status: response.status };
}

async function fetchSofascoreLive(): Promise<{
  payload: SofascoreLivePayload;
  status: number;
}> {
  const response = await fetch(SOFASCORE_LIVE_RESULTS_URL, {
    headers: {
      accept: "application/json,text/plain,*/*",
      origin: "https://www.sofascore.com",
      referer: "https://www.sofascore.com/",
      "user-agent": BROWSER_USER_AGENT,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Sofascore live devolvió HTTP ${response.status}`);
  }
  const payload = (await response.json()) as SofascoreLivePayload;
  if (!Array.isArray(payload.events)) {
    throw new Error("Sofascore live devolvió una respuesta sin events");
  }
  return { payload, status: response.status };
}

function diagnostic(
  id: string,
  name: string,
  url: string,
  checkedAt: string,
  extracted: number,
  options: { httpStatus?: number; error?: string; cache?: SourceDiagnostic["cache"] } = {},
): SourceDiagnostic {
  return {
    id,
    name,
    url,
    policyStatus: options.error ? "unavailable" : "allowed",
    httpStatus: options.httpStatus,
    cache: options.cache ?? "disabled",
    extracted: { matches: extracted, standings: 0 },
    placeholderKickoffsDiscarded: 0,
    checkedAt,
    error: options.error,
  };
}

function patchKey(patch: OfficialMatchPatch): string {
  return `${patch.round ?? 0}|${normalizeTeamName(patch.homeTeamName)}|${normalizeTeamName(patch.awayTeamName)}`;
}

export class RfefLiveResultsProvider {
  constructor(private readonly http: ResponsibleHttpClient) {}

  async getResults(
    matches: NormalizedGroupMatch[],
    options: { now?: Date; force?: boolean } = {},
  ): Promise<ResultsFetch> {
    const now = options.now ?? new Date();
    const checkedAt = now.toISOString();
    const diagnostics: SourceDiagnostic[] = [];
    let livePatches: OfficialMatchPatch[] = [];
    let fallbackLivePatches: OfficialMatchPatch[] = [];
    let articlePatches: OfficialMatchPatch[] = [];
    const articleRound = selectRfefArticleRound(matches, now);
    const articleUrl = articleRound
      ? rfefRoundArticleUrl(articleRound)
      : undefined;

    try {
      const result = await fetchRfefLiveHtml();
      const source: SourceReference = {
        id: "rfef-live-scoreboard",
        name: "Marcadores RFEF · ATR",
        url: RFEF_LIVE_RESULTS_URL,
        fetchedAt: checkedAt,
        isOfficial: true,
      };
      livePatches = parseRfefResultsHtml(result.html, matches, source, { now });
      diagnostics.push(
        diagnostic(
          "rfef-live-scoreboard",
          "Marcadores RFEF · ATR",
          RFEF_LIVE_RESULTS_URL,
          checkedAt,
          livePatches.length,
          { httpStatus: result.status },
        ),
      );
    } catch (error) {
      diagnostics.push(
        diagnostic(
          "rfef-live-scoreboard",
          "Marcadores RFEF · ATR",
          RFEF_LIVE_RESULTS_URL,
          checkedAt,
          0,
          { error: error instanceof Error ? error.message : "Error de Marcadores RFEF" },
        ),
      );
    }

    try {
      const result = await fetchSofascoreLive();
      const source: SourceReference = {
        id: "sofascore-live-fallback",
        name: "Sofascore · respaldo en vivo",
        url: SOFASCORE_LIVE_RESULTS_URL,
        fetchedAt: checkedAt,
      };
      fallbackLivePatches = parseSofascoreLivePayload(
        result.payload,
        matches,
        source,
      );
      diagnostics.push(
        diagnostic(
          "sofascore-live-fallback",
          "Sofascore · respaldo en vivo",
          SOFASCORE_LIVE_RESULTS_URL,
          checkedAt,
          fallbackLivePatches.length,
          { httpStatus: result.status },
        ),
      );
    } catch (error) {
      diagnostics.push(
        diagnostic(
          "sofascore-live-fallback",
          "Sofascore · respaldo en vivo",
          SOFASCORE_LIVE_RESULTS_URL,
          checkedAt,
          0,
          { error: error instanceof Error ? error.message : "Error del respaldo en vivo" },
        ),
      );
    }

    try {
      if (!articleUrl || !articleRound) {
        throw new Error("No se pudo determinar la jornada vigente");
      }
      const article = await this.http.get(articleUrl, {
        maxAgeMs: TWO_MINUTES_MS,
        accept: "text/html,application/xhtml+xml",
        timeoutMs: 10_000,
        retries: 1,
        now,
        force: options.force,
      });
      const source: SourceReference = {
        id: "rfef-results-article",
        name: `RFEF · horarios y resultados de la jornada ${articleRound}`,
        url: articleUrl,
        fetchedAt: article.fetchedAt,
        isOfficial: true,
      };
      articlePatches = parseRfefRoundArticleHtml(
        responseText(article),
        matches.filter((match) => match.round === articleRound),
        source,
      );
      diagnostics.push(
        diagnostic(
          "rfef-results-article",
          `RFEF · horarios y resultados de la jornada ${articleRound}`,
          articleUrl,
          article.checkedAt,
          articlePatches.length,
          { httpStatus: article.status, cache: article.cache },
        ),
      );
    } catch (error) {
      diagnostics.push(
        diagnostic(
          "rfef-results-article",
          "RFEF · resultados de la jornada",
          articleUrl ?? "https://rfef.es/es/noticias",
          checkedAt,
          0,
          { error: error instanceof Error ? error.message : "Error de resultados RFEF" },
        ),
      );
    }

    const merged = new Map<string, OfficialMatchPatch>();
    for (const patch of fallbackLivePatches) merged.set(patchKey(patch), patch);
    for (const patch of livePatches) merged.set(patchKey(patch), patch);
    for (const patch of articlePatches) merged.set(patchKey(patch), patch);

    return { patches: [...merged.values()], diagnostics };
  }
}
