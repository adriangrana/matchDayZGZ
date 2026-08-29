function constantTimeEqual(first: string, second: string): boolean {
  const firstBytes = new TextEncoder().encode(first);
  const secondBytes = new TextEncoder().encode(second);
  const length = Math.max(firstBytes.length, secondBytes.length);
  let difference = firstBytes.length ^ secondBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |=
      (firstBytes[index] ?? 0) ^ (secondBytes[index] ?? 0);
  }
  return difference === 0;
}

export function authorizeInternalSync(
  request: Request,
  configuredSecret?: string,
): Response | undefined {
  const secrets = [
    configuredSecret?.trim(),
    process.env.MATCHDAY_SYNC_SECRET?.trim(),
  ].filter((value): value is string => Boolean(value));
  if (secrets.length === 0) {
    return Response.json(
      { ok: false, error: "El secreto interno no está configurado" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (
    !provided ||
    !secrets.some((secret) => constantTimeEqual(provided, secret))
  ) {
    return Response.json(
      { ok: false, error: "No autorizado" },
      { status: 401 },
    );
  }

  return undefined;
}
