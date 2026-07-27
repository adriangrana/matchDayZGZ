export interface FetchPolicy {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  beforeAttempt?: (attempt: number) => Promise<void> | void;
}

function abortSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  policy: FetchPolicy = {},
): Promise<Response> {
  const timeoutMs = policy.timeoutMs ?? 8_000;
  const retries = policy.retries ?? 2;
  const retryDelayMs = policy.retryDelayMs ?? 350;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await policy.beforeAttempt?.(attempt);
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "user-agent": "MatchDay-ZGZ/0.3 (+local personal prototype)",
          accept: "application/rss+xml, application/xml, text/xml;q=0.9",
          ...init.headers,
        },
        signal: abortSignal(init.signal ?? undefined, timeoutMs),
      });

      if (response.ok) return response;
      if (response.status < 500 && response.status !== 429) {
        throw new Error(`Respuesta no recuperable ${response.status} para ${url}`);
      }
      lastError = new Error(`Respuesta ${response.status} para ${url}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelayMs * 2 ** attempt),
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`No se pudo obtener ${url}`);
}
