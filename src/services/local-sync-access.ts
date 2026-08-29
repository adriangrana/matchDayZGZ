const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isAuthorizedLocalSyncRequest(request: Request): boolean {
  try {
    const requestUrl = new URL(request.url);
    const originHeader = request.headers.get("origin");
    if (!originHeader || !loopbackHosts.has(requestUrl.hostname)) return false;

    const origin = new URL(originHeader);
    return (
      loopbackHosts.has(origin.hostname) &&
      origin.protocol === requestUrl.protocol &&
      origin.port === requestUrl.port
    );
  } catch {
    return false;
  }
}
