import type {
  OfficialMatchPatch,
  SourceDiagnostic,
} from "@/src/providers/free-sports-types";
import {
  ResponsibleHttpClient,
  responseText,
} from "@/src/services/responsible-http-client";
import { isPathAllowedByRobots } from "@/src/services/robots-policy";

const BASE_URL = "https://www.realzaragoza.com";
const ROBOTS_URL = `${BASE_URL}/robots.txt`;
const PAGE_URLS = [
  `${BASE_URL}/partidos`,
  `${BASE_URL}/agenda`,
  `${BASE_URL}/noticias`,
] as const;
const SIX_HOURS_MS = 6 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function textFromClass(fragment: string, className: string): string | undefined {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = fragment.match(
    new RegExp(
      `class="[^"]*${escaped}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
      "i",
    ),
  );
  if (!match) return undefined;
  return decodeEntities(match[1]!.replace(/<[^>]*>/g, " "));
}

function numericTextsFromClass(fragment: string, className: string): number[] {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...fragment.matchAll(
    new RegExp(
      `class="[^"]*${escaped}[^"]*"[^>]*>\\s*(\\d+)\\s*<`,
      "gi",
    ),
  )].map((match) => Number(match[1]));
}

export function parseOfficialMatchesHtml(
  html: string,
  url: string,
  fetchedAt = new Date().toISOString(),
): OfficialMatchPatch[] {
  const labels = [...html.matchAll(/aria-label="([^"]+?)\s+vs\s+([^"]+?)"/gi)];
  const patches: OfficialMatchPatch[] = [];

  labels.forEach((label, index) => {
    const homeTeamName = decodeEntities(label[1]!);
    const awayTeamName = decodeEntities(label[2]!);
    if (
      !/real zaragoza/i.test(homeTeamName) &&
      !/real zaragoza/i.test(awayTeamName)
    ) {
      return;
    }
    const start = Math.max(0, (label.index ?? 0) - 1_500);
    const nextIndex = labels[index + 1]?.index ?? (label.index ?? 0) + 12_000;
    const fragment = html.slice(start, Math.min(html.length, nextIndex));
    const competition = textFromClass(
      fragment,
      "MkFootballMatchCard__competition",
    );
    if (
      competition &&
      !/primera federaci[oó]n|amistoso|friendly|copa del rey/i.test(competition)
    ) {
      return;
    }
    const roundText = textFromClass(
      fragment,
      "MkFootballMatchCard__matchWeek",
    );
    const round = Number(roundText?.match(/\d+/)?.[0]);
    const venue = textFromClass(fragment, "MkFootballMatchCard__venue");
    const dateTime = fragment.match(
      /<time[^>]+dateTime="([^"]+)"/i,
    )?.[1];
    const statusClass = fragment.match(
      /MkFootballMatchCard--status-([a-z-]+)/i,
    )?.[1];
    const scores = numericTextsFromClass(
      fragment,
      "MkFootballMatchCard__score",
    );
    const score =
      scores.length >= 2 ? { home: scores[0]!, away: scores[1]! } : undefined;
    const status =
      score || /finished|played|ended/.test(statusClass ?? "")
        ? "finished"
        : /postponed|suspended/.test(statusClass ?? "")
          ? "postponed"
          : "scheduled";

    patches.push({
      round: Number.isInteger(round) && round > 0 ? round : undefined,
      homeTeamName,
      awayTeamName,
      startsAt:
        dateTime && !Number.isNaN(new Date(dateTime).getTime())
          ? new Date(dateTime).toISOString()
          : undefined,
      kickoffStatus: dateTime ? "confirmed" : "unknown",
      venue,
      score,
      status,
      source: {
        id: "real-zaragoza-official",
        name: "Real Zaragoza oficial",
        url,
        fetchedAt,
        isOfficial: true,
      },
    });
  });

  return patches;
}

function countRelevantNews(html: string): number {
  const text = decodeEntities(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "),
  );
  return [...text.matchAll(/horarios?|amistosos?|partidos?/gi)].length;
}

export class RealZaragozaOfficialProvider {
  readonly id = "real-zaragoza-official";

  constructor(private readonly http: ResponsibleHttpClient) {}

  async getOfficialData(options: {
    now?: Date;
    force?: boolean;
  } = {}): Promise<{
    patches: OfficialMatchPatch[];
    diagnostics: SourceDiagnostic[];
  }> {
    const now = options.now ?? new Date();
    const robots = await this.http.get(ROBOTS_URL, {
      maxAgeMs: DAY_MS,
      accept: "text/plain",
      timeoutMs: 8_000,
      retries: 1,
      now,
      force: options.force,
    });
    const robotsText = responseText(robots);
    const patches: OfficialMatchPatch[] = [];
    const diagnostics: SourceDiagnostic[] = [];

    for (const url of PAGE_URLS) {
      const path = new URL(url).pathname;
      if (!isPathAllowedByRobots(robotsText, path)) {
        diagnostics.push({
          id: `${this.id}-${path.slice(1)}`,
          name: `Real Zaragoza ${path}`,
          url,
          policyStatus: "blocked-by-robots",
          cache: "disabled",
          extracted: { matches: 0, standings: 0 },
          placeholderKickoffsDiscarded: 0,
          checkedAt: now.toISOString(),
          error: "Ruta bloqueada por robots.txt",
        });
        continue;
      }

      try {
        const response = await this.http.get(url, {
          maxAgeMs: SIX_HOURS_MS,
          accept: "text/html",
          timeoutMs: 10_000,
          retries: 1,
          now,
          force: options.force,
        });
        const html = responseText(response);
        const pagePatches =
          path === "/noticias"
            ? []
            : parseOfficialMatchesHtml(html, url, response.fetchedAt);
        patches.push(...pagePatches);
        diagnostics.push({
          id: `${this.id}-${path.slice(1)}`,
          name: `Real Zaragoza ${path}`,
          url,
          policyStatus: "allowed",
          httpStatus: response.status,
          durationMs: response.durationMs,
          cache: response.cache,
          extracted: {
            matches: pagePatches.length,
            standings: 0,
          },
          placeholderKickoffsDiscarded: 0,
          checkedAt: response.checkedAt,
          etag: response.etag,
          lastModified: response.lastModified,
          hash: response.hash,
          error:
            response.error ??
            (path === "/noticias" && countRelevantNews(html) > 0
              ? "Se detectaron noticias candidatas; no se copió su contenido"
              : undefined),
        });
      } catch (error) {
        diagnostics.push({
          id: `${this.id}-${path.slice(1)}`,
          name: `Real Zaragoza ${path}`,
          url,
          policyStatus: "unavailable",
          cache: "miss",
          extracted: { matches: 0, standings: 0 },
          placeholderKickoffsDiscarded: 0,
          checkedAt: now.toISOString(),
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    return { patches, diagnostics };
  }
}

