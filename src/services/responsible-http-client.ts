import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const USER_AGENT =
  "MatchDay-ZGZ/0.4 (local personal prototype; low-volume sports facts fetcher)";

interface CachedHttpResponse {
  version: 1;
  url: string;
  status: number;
  checkedAt: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
  contentType?: string;
  hash: string;
  bodyBase64: string;
}

export interface ResponsibleFetchOptions {
  maxAgeMs: number;
  accept: string;
  timeoutMs?: number;
  retries?: number;
  now?: Date;
  force?: boolean;
}

export interface ResponsibleFetchResult {
  url: string;
  status: number;
  durationMs: number;
  cache: "fresh" | "revalidated" | "updated" | "miss" | "stale";
  checkedAt: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
  contentType?: string;
  hash: string;
  body: Uint8Array;
  error?: string;
}

function cacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function hashBody(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

function retryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function toResult(
  record: CachedHttpResponse,
  cache: ResponsibleFetchResult["cache"],
  durationMs: number,
): ResponsibleFetchResult {
  return {
    url: record.url,
    status: record.status,
    durationMs,
    cache,
    checkedAt: record.checkedAt,
    fetchedAt: record.fetchedAt,
    etag: record.etag,
    lastModified: record.lastModified,
    contentType: record.contentType,
    hash: record.hash,
    body: Uint8Array.from(Buffer.from(record.bodyBase64, "base64")),
  };
}

export class ResponsibleHttpClient {
  private readonly inFlight = new Map<
    string,
    Promise<ResponsibleFetchResult>
  >();
  private requests = 0;

  constructor(
    private readonly cacheDirectory = join(
      process.cwd(),
      ".cache",
      "free-sports-http",
    ),
    private readonly requestLimit = 20,
  ) {}

  get requestCount(): number {
    return this.requests;
  }

  async get(
    url: string,
    options: ResponsibleFetchOptions,
  ): Promise<ResponsibleFetchResult> {
    const existing = this.inFlight.get(url);
    if (existing) return existing;
    const operation = this.fetchOnce(url, options).finally(() => {
      this.inFlight.delete(url);
    });
    this.inFlight.set(url, operation);
    return operation;
  }

  private async fetchOnce(
    url: string,
    options: ResponsibleFetchOptions,
  ): Promise<ResponsibleFetchResult> {
    const now = options.now ?? new Date();
    const cached = await this.readCache(url);
    if (
      !options.force &&
      cached &&
      now.getTime() - new Date(cached.checkedAt).getTime() < options.maxAgeMs
    ) {
      return toResult(cached, "fresh", 0);
    }

    const headers = new Headers({
      accept: options.accept,
      "user-agent": USER_AGENT,
    });
    if (cached?.etag) headers.set("if-none-match", cached.etag);
    if (cached?.lastModified) {
      headers.set("if-modified-since", cached.lastModified);
    }

    const retries = Math.max(0, Math.min(options.retries ?? 1, 1));
    const startedAt = performance.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (this.requests >= this.requestLimit) {
        throw new Error(
          `Límite interno de ${this.requestLimit} solicitudes por ejecución alcanzado`,
        );
      }
      this.requests += 1;

      try {
        const response = await fetch(url, {
          headers,
          redirect: "follow",
          signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
        });
        const checkedAt = now.toISOString();

        if (response.status === 304 && cached) {
          const revalidated = { ...cached, checkedAt };
          await this.writeCache(revalidated);
          return toResult(
            revalidated,
            "revalidated",
            Math.round(performance.now() - startedAt),
          );
        }

        if (!response.ok) {
          const error = new Error(
            `Respuesta HTTP ${response.status} para ${url}`,
          );
          if (!retryable(response.status) || attempt === retries) throw error;
          lastError = error;
        } else {
          const body = new Uint8Array(await response.arrayBuffer());
          const record: CachedHttpResponse = {
            version: 1,
            url,
            status: response.status,
            checkedAt,
            fetchedAt: checkedAt,
            etag: response.headers.get("etag") ?? undefined,
            lastModified:
              response.headers.get("last-modified") ?? undefined,
            contentType: response.headers.get("content-type") ?? undefined,
            hash: hashBody(body),
            bodyBase64: Buffer.from(body).toString("base64"),
          };
          await this.writeCache(record);
          return toResult(
            record,
            cached ? "updated" : "miss",
            Math.round(performance.now() - startedAt),
          );
        }
      } catch (error) {
        lastError = error;
        if (attempt === retries) break;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    if (cached) {
      const result = toResult(
        cached,
        "stale",
        Math.round(performance.now() - startedAt),
      );
      result.error =
        lastError instanceof Error ? lastError.message : "Error de red";
      return result;
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`No se pudo consultar ${url}`);
  }

  private cachePath(url: string): string {
    return join(this.cacheDirectory, `${cacheKey(url)}.json`);
  }

  private async readCache(url: string): Promise<CachedHttpResponse | undefined> {
    try {
      const parsed = JSON.parse(
        await readFile(this.cachePath(url), "utf8"),
      ) as CachedHttpResponse;
      return parsed.version === 1 && parsed.url ? parsed : undefined;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code === "ENOENT" || error instanceof SyntaxError) return undefined;
      throw error;
    }
  }

  private async writeCache(record: CachedHttpResponse): Promise<void> {
    const path = this.cachePath(record.url);
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(record)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, path);
  }
}

export function responseText(result: ResponsibleFetchResult): string {
  return new TextDecoder().decode(result.body);
}

export const sportsFetcherUserAgent = USER_AGENT;
