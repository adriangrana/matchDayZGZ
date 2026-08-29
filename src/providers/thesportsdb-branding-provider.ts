import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  groupOneTeamAliases,
  groupTwoTeamAliases,
  groupTwoTeams,
  normalizeTeamName,
} from "@/src/data/primera-federacion-teams";
import type { Team } from "@/src/domain/models";
import type {
  TeamBrandingProvider,
  TeamBrandingRecord,
  TeamBrandingSnapshot,
} from "@/src/providers/team-branding-provider";

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const SOURCE_DOCS = "https://www.thesportsdb.com/documentation";
const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;
const allowedMimeTypes = new Set([
  "image/png",
  "image/webp",
  "image/jpeg",
  "image/svg+xml",
]);
const extensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

export interface TheSportsDbTeam {
  idTeam?: string;
  strTeam?: string;
  strTeamAlternate?: string;
  strSport?: string;
  strCountry?: string;
  strLeague?: string;
  strBadge?: string;
}

function acceptableNames(team: Team, aliases: string[]): Set<string> {
  return new Set(
    [team.name, team.shortName, ...aliases].map(normalizeTeamName),
  );
}

function candidateNames(candidate: TheSportsDbTeam): Set<string> {
  return new Set(
    [candidate.strTeam, ...(candidate.strTeamAlternate?.split(",") ?? [])]
      .filter((value): value is string => Boolean(value?.trim()))
      .map(normalizeTeamName),
  );
}

export function candidateMatchesTeam(
  team: Team,
  aliases: string[],
  candidate: TheSportsDbTeam,
): boolean {
  if (candidate.strSport !== "Soccer" || candidate.strCountry !== "Spain") {
    return false;
  }
  const expected = acceptableNames(team, aliases);
  return [...candidateNames(candidate)].some((name) => expected.has(name));
}

function pngDimensions(body: Uint8Array) {
  if (
    body.length < 24 ||
    body[0] !== 0x89 ||
    body[1] !== 0x50 ||
    body[2] !== 0x4e ||
    body[3] !== 0x47
  ) {
    return undefined;
  }
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(body: Uint8Array) {
  if (body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8) {
    return undefined;
  }
  let offset = 2;
  while (offset + 9 < body.length) {
    if (body[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = body[offset + 1]!;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = (body[offset + 2]! << 8) | body[offset + 3]!;
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb].includes(
        marker,
      )
    ) {
      return {
        width: (body[offset + 7]! << 8) | body[offset + 8]!,
        height: (body[offset + 5]! << 8) | body[offset + 6]!,
      };
    }
    if (length < 2) return undefined;
    offset += length + 2;
  }
  return undefined;
}

function webpDimensions(body: Uint8Array) {
  const text = new TextDecoder("ascii").decode(body.slice(0, 30));
  if (!text.startsWith("RIFF") || text.slice(8, 12) !== "WEBP") {
    return undefined;
  }
  const chunk = text.slice(12, 16);
  if (chunk === "VP8X" && body.length >= 30) {
    const width = 1 + body[24]! + (body[25]! << 8) + (body[26]! << 16);
    const height = 1 + body[27]! + (body[28]! << 8) + (body[29]! << 16);
    return { width, height };
  }
  if (chunk === "VP8L" && body.length >= 25 && body[20] === 0x2f) {
    const bits =
      body[21]! | (body[22]! << 8) | (body[23]! << 16) | (body[24]! << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return undefined;
}

function svgDimensions(body: Uint8Array) {
  const text = new TextDecoder().decode(body.slice(0, 65_536));
  const svg = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!svg || /<image\b/i.test(text)) return undefined;
  const width = Number(svg.match(/\bwidth=["']([\d.]+)/i)?.[1]);
  const height = Number(svg.match(/\bheight=["']([\d.]+)/i)?.[1]);
  if (width > 0 && height > 0) return { width, height };
  const viewBox = svg
    .match(/\bviewBox=["']([^"']+)/i)?.[1]
    ?.trim()
    .split(/\s+/)
    .map(Number);
  if (viewBox?.length === 4 && viewBox[2]! > 0 && viewBox[3]! > 0) {
    return { width: viewBox[2]!, height: viewBox[3]! };
  }
  return undefined;
}

export function validateBadgeBytes(
  mimeType: string,
  body: Uint8Array,
): { width: number; height: number } | undefined {
  const normalizedMime = mimeType.split(";")[0]!.trim().toLowerCase();
  if (!allowedMimeTypes.has(normalizedMime) || body.length < 512) {
    return undefined;
  }
  const dimensions =
    normalizedMime === "image/png"
      ? pngDimensions(body)
      : normalizedMime === "image/jpeg"
        ? jpegDimensions(body)
        : normalizedMime === "image/webp"
          ? webpDimensions(body)
          : svgDimensions(body);
  if (!dimensions || dimensions.width < 48 || dimensions.height < 48) {
    return undefined;
  }
  const ratio = dimensions.width / dimensions.height;
  if (ratio > 5 || ratio < 0.2) return undefined;
  return dimensions;
}

function aliasesForTeam(team: Team): string[] {
  return groupTwoTeamAliases[team.id] ?? groupOneTeamAliases[team.id] ?? [];
}

function fingerprint(teams: Team[]): string {
  return teams
    .map((team) => team.id)
    .sort()
    .join("|");
}

async function safeRead(
  path: string,
): Promise<TeamBrandingSnapshot | undefined> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as TeamBrandingSnapshot;
    return value.provider === "thesportsdb" ? value : undefined;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "ENOENT" || error instanceof SyntaxError) return undefined;
    throw error;
  }
}

async function atomicWrite(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function atomicWriteBytes(
  path: string,
  value: Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, path);
}

export class TheSportsDbBrandingProvider implements TeamBrandingProvider {
  readonly id = "thesportsdb";
  private requests = 0;

  constructor(
    private readonly cachePath = join(
      process.cwd(),
      ".cache",
      "team-branding.json",
    ),
    private readonly bundledPath = join(
      process.cwd(),
      "src",
      "data",
      "team-branding-snapshot.json",
    ),
    private readonly request: typeof fetch = fetch,
    private readonly assetsDirectory = join(
      process.cwd(),
      "public",
      "team-badges",
    ),
    private readonly teams: Team[] = groupTwoTeams,
  ) {}

  async inspect(): Promise<TeamBrandingSnapshot | undefined> {
    return safeRead(this.cachePath);
  }

  private async cachedAssetsAvailable(
    snapshot: TeamBrandingSnapshot,
  ): Promise<boolean> {
    const validated = snapshot.records.filter(
      (record) => record.validation === "validated",
    );
    const checks = await Promise.all(
      validated.map(async (record) => {
        if (!record.localAssetPath) return false;
        try {
          await access(
            join(this.assetsDirectory, basename(record.localAssetPath)),
          );
          return true;
        } catch {
          return false;
        }
      }),
    );
    return checks.every(Boolean);
  }

  private async search(query: string): Promise<TheSportsDbTeam[]> {
    this.requests += 1;
    const url = `${API_BASE}/searchteams.php?t=${encodeURIComponent(query)}`;
    const response = await this.request(url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "MatchDay-ZGZ/0.5 (local personal prototype; weekly badge sync)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`TheSportsDB respondió ${response.status}`);
    }
    const value = (await response.json()) as { teams?: TheSportsDbTeam[] | null };
    return Array.isArray(value.teams) ? value.teams : [];
  }

  private async validateImage(
    badgeUrl: string,
  ): Promise<
    | {
        mimeType: string;
        width: number;
        height: number;
        body: Uint8Array;
      }
    | { reason: string }
  > {
    let url: URL;
    try {
      url = new URL(badgeUrl);
    } catch {
      return { reason: "URL de escudo no válida" };
    }
    if (url.protocol !== "https:") {
      return { reason: "El escudo no usa HTTPS" };
    }

    this.requests += 1;
    const response = await this.request(url, {
      headers: { accept: "image/png,image/webp,image/jpeg,image/svg+xml" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      return { reason: `La imagen respondió ${response.status}` };
    }
    const mimeType = (response.headers.get("content-type") ?? "")
      .split(";")[0]!
      .trim()
      .toLowerCase();
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 5_000_000) {
      await response.body?.cancel();
      return { reason: "La imagen supera el tamaño máximo de validación" };
    }
    const body = new Uint8Array(await response.arrayBuffer());
    const dimensions = validateBadgeBytes(mimeType, body);
    if (!dimensions) {
      return {
        reason:
          "MIME, firma, dimensiones o proporción de la imagen no válidos",
      };
    }
    return { mimeType, ...dimensions, body };
  }

  private async resolveTeam(
    team: Team,
    now: Date,
  ): Promise<TeamBrandingRecord> {
    const aliases = aliasesForTeam(team);
    const queries = [team.name, ...aliases];
    let ambiguous: TheSportsDbTeam | undefined;

    for (const query of queries) {
      const candidates = await this.search(query);
      const match = candidates.find((candidate) =>
        candidateMatchesTeam(team, aliases, candidate),
      );
      if (!match) {
        ambiguous ??= candidates.find(
          (candidate) =>
            candidate.strSport === "Soccer" &&
            candidate.strCountry === "Spain",
        );
        continue;
      }
      const provenance = `${API_BASE}/searchteams.php?t=${encodeURIComponent(query)}`;
      if (!match.strBadge) {
        return {
          canonicalTeamId: team.id,
          canonicalName: team.name,
          aliases,
          provider: "thesportsdb",
          providerTeamId: match.idTeam,
          syncedAt: now.toISOString(),
          validation: "not-found",
          provenance,
          reason: "El equipo fue encontrado pero no tiene strBadge",
        };
      }
      const image = await this.validateImage(match.strBadge);
      if ("reason" in image) {
        return {
          canonicalTeamId: team.id,
          canonicalName: team.name,
          aliases,
          provider: "thesportsdb",
          providerTeamId: match.idTeam,
          syncedAt: now.toISOString(),
          validation: "rejected",
          provenance,
          reason: image.reason,
        };
      }
      const extension = extensionByMimeType[image.mimeType]!;
      const assetName = `${team.id}.${extension}`;
      await atomicWriteBytes(
        join(this.assetsDirectory, assetName),
        image.body,
      );
      return {
        canonicalTeamId: team.id,
        canonicalName: team.name,
        aliases,
        provider: "thesportsdb",
        providerTeamId: match.idTeam,
        badgeUrl: match.strBadge,
        localAssetPath: `/team-badges/${assetName}`,
        syncedAt: now.toISOString(),
        validation: "validated",
        provenance,
        image: {
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
        },
      };
    }

    return {
      canonicalTeamId: team.id,
      canonicalName: team.name,
      aliases,
      provider: "thesportsdb",
      providerTeamId: ambiguous?.idTeam,
      syncedAt: now.toISOString(),
      validation: ambiguous ? "ambiguous" : "not-found",
      provenance: SOURCE_DOCS,
      reason: ambiguous
        ? `Coincidencia rechazada: ${ambiguous.strTeam ?? "equipo sin nombre"}`
        : "TheSportsDB no devolvió una coincidencia válida",
    };
  }

  async sync(
    options: { force?: boolean; now?: Date } = {},
  ): Promise<TeamBrandingSnapshot> {
    const now = options.now ?? new Date();
    const currentFingerprint = fingerprint(this.teams);
    const cached = await this.inspect();
    if (
      !options.force &&
      cached?.teamFingerprint === currentFingerprint &&
      new Date(cached.refreshAfter).getTime() > now.getTime() &&
      (await this.cachedAssetsAvailable(cached))
    ) {
      const reused = {
        ...cached,
        stats: {
          ...cached.stats,
          requests: 0,
          fromCache: cached.records.length,
        },
      };
      await atomicWrite(this.bundledPath, reused);
      return reused;
    }

    this.requests = 0;
    const records: TeamBrandingRecord[] = [];
    for (const team of this.teams) {
      try {
        records.push(await this.resolveTeam(team, now));
      } catch (error) {
        records.push({
          canonicalTeamId: team.id,
          canonicalName: team.name,
          aliases: aliasesForTeam(team),
          provider: "thesportsdb",
          syncedAt: now.toISOString(),
          validation: "rejected",
          provenance: SOURCE_DOCS,
          reason:
            error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    const snapshot: TeamBrandingSnapshot = {
      provider: "thesportsdb",
      syncedAt: now.toISOString(),
      refreshAfter: new Date(now.getTime() + WEEK_MS).toISOString(),
      teamFingerprint: currentFingerprint,
      records,
      stats: {
        processed: records.length,
        found: records.filter((record) => record.providerTeamId).length,
        validated: records.filter(
          (record) => record.validation === "validated",
        ).length,
        rejected: records.filter(
          (record) => record.validation === "rejected",
        ).length,
        ambiguous: records.filter(
          (record) => record.validation === "ambiguous",
        ).length,
        missing: records.filter(
          (record) => record.validation === "not-found",
        ).length,
        requests: this.requests,
        fromCache: 0,
      },
    };
    await atomicWrite(this.cachePath, snapshot);
    await atomicWrite(this.bundledPath, snapshot);
    return snapshot;
  }
}
