import { z } from "zod";
import type {
  ConfirmationLevel,
  NewsArticle,
  NewsCategory,
  SourceReference,
} from "@/src/domain/models";

export interface RawNewsItem {
  title: string;
  url: string;
  description?: string;
  author?: string;
  publishedAt: string;
  updatedAt?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}

const normalizedNewsSchema = z.object({
  id: z.string().min(3),
  title: z.string().min(5).max(300),
  summary: z.string().max(420),
  originalUrl: z.url({ protocol: /^https?$/ }),
  canonicalUrl: z.url({ protocol: /^https?$/ }),
  author: z.string().max(160).optional(),
  publishedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  category: z.enum([
    "oficial",
    "fichajes",
    "plantilla",
    "partidos",
    "entrenamientos",
    "cantera",
    "abonados",
    "estadio",
    "institucional",
    "otros",
  ]),
  confirmation: z.enum([
    "official",
    "confirmed",
    "negotiation",
    "rumor",
    "dismissed",
    "unknown",
  ]),
  imageUrl: z.url({ protocol: /^https$/ }).optional(),
  relatedEntityIds: z.array(z.string()),
  syncedAt: z.iso.datetime(),
});

const htmlEntities: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&#39;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

export function plainText(value = ""): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /&(?:amp|apos|quot|lt|gt|nbsp);|&#39;/g,
      (entity) => htmlEntities[entity] ?? " ",
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (
      key.startsWith("utm_") ||
      ["fbclid", "gclid", "ref", "output"].includes(key)
    ) {
      url.searchParams.delete(key);
    }
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

export function normalizeTitle(value: string): string {
  return plainText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyCategory(
  title: string,
  summary: string,
  sourceIsOfficial: boolean,
): NewsCategory {
  const value = normalizeTitle(`${title} ${summary}`);
  const rules: Array<[NewsCategory, string[]]> = [
    ["abonados", ["abonado", "abono", "socio", "campana de socios"]],
    ["cantera", ["cantera", "deportivo aragon", "juvenil", "filial"]],
    ["entrenamientos", ["entrenamiento", "sesion", "pretemporada"]],
    ["estadio", ["romareda", "ibercaja estadio", "estadio"]],
    ["partidos", ["partido", "jornada", "amistoso", "convocatoria", "alineacion"]],
    ["fichajes", ["fichaje", "traspaso", "cesion", "incorpora", "nuevo jugador"]],
    ["plantilla", ["plantilla", "jugador", "lesion", "renueva", "renovacion"]],
    ["institucional", ["accionista", "directiva", "patrocinador", "institucional"]],
  ];

  const match = rules.find(([, keywords]) =>
    keywords.some((keyword) => value.includes(keyword)),
  );
  if (match) return match[0];
  return sourceIsOfficial ? "oficial" : "otros";
}

export function classifyConfirmation(
  title: string,
  summary: string,
  sourceIsOfficial: boolean,
): ConfirmationLevel {
  if (sourceIsOfficial) return "official";

  const value = normalizeTitle(`${title} ${summary}`);
  if (/(descarta|descartado|rechaza|no fichara)/.test(value)) {
    return "dismissed";
  }
  if (/(negocia|negociacion|conversaciones|acuerdo cercano)/.test(value)) {
    return "negotiation";
  }
  if (/(podria|suena|interesa|pretende|rumor|en la orbita)/.test(value)) {
    return "rumor";
  }
  if (/(confirma|confirmado|renueva|nuevo jugador|firma hasta)/.test(value)) {
    return "confirmed";
  }
  return "unknown";
}

export function extractEntities(title: string, summary: string): string[] {
  const value = plainText(`${title}. ${summary}`);
  const entities = new Set<string>(["real-zaragoza"]);
  const candidates =
    value.match(
      /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+(?:de|del|la|los|y))?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g,
    ) ?? [];

  for (const candidate of candidates.slice(0, 8)) {
    const slug = normalizeTitle(candidate).replace(/\s+/g, "-");
    if (slug !== "real-zaragoza") entities.add(slug);
  }
  return [...entities];
}

function stableId(sourceId: string, canonicalUrl: string): string {
  let hash = 5381;
  for (const character of canonicalUrl) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return `${sourceId}-${(hash >>> 0).toString(36)}`;
}

function imageCandidate(item: RawNewsItem): string | undefined {
  if (!item.imageUrl) return undefined;

  let url: URL;
  try {
    url = new URL(item.imageUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:") return undefined;
  if (
    /(?:^|[/_.-])(logo|icon|avatar|placeholder|pixel)(?:[/_.-]|$)/i.test(
      url.pathname,
    )
  ) {
    return undefined;
  }
  if (
    (item.imageWidth !== undefined && item.imageWidth < 300) ||
    (item.imageHeight !== undefined && item.imageHeight < 160)
  ) {
    return undefined;
  }
  return url.toString();
}

export function normalizeNewsItem(
  item: RawNewsItem,
  source: SourceReference,
  syncedAt: string,
): NewsArticle {
  const title = plainText(item.title).slice(0, 300);
  const summary = plainText(item.description).slice(0, 360);
  const canonicalUrl = canonicalizeUrl(item.url);
  const publishedAt = new Date(item.publishedAt).toISOString();
  const updatedAt = new Date(item.updatedAt ?? item.publishedAt).toISOString();

  const candidate = {
    id: stableId(source.id, canonicalUrl),
    title,
    summary,
    originalUrl: item.url,
    canonicalUrl,
    author: item.author ? plainText(item.author).slice(0, 160) : undefined,
    publishedAt,
    updatedAt,
    category: classifyCategory(title, summary, source.isOfficial === true),
    confirmation: classifyConfirmation(
      title,
      summary,
      source.isOfficial === true,
    ),
    imageUrl: imageCandidate(item),
    relatedEntityIds: extractEntities(title, summary),
    syncedAt,
  };

  return {
    ...normalizedNewsSchema.parse(candidate),
    source,
  };
}
