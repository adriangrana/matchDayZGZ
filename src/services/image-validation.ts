import { fetchWithRetry } from "@/src/services/fetch-with-retry";

const minimumBytes = 2_048;

export function isAllowedRemoteImageUrl(imageUrl: string): boolean {
  try {
    const parsed = new URL(imageUrl);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

function validResponse(response: Response): boolean {
  const type = response.headers.get("content-type") ?? "";
  const length = Number(response.headers.get("content-length") ?? minimumBytes);
  return type.startsWith("image/") && (!Number.isFinite(length) || length >= minimumBytes);
}

export async function validateRemoteImage(
  imageUrl: string,
): Promise<string | undefined> {
  if (!isAllowedRemoteImageUrl(imageUrl)) return undefined;

  try {
    const head = await fetchWithRetry(
      imageUrl,
      {
        method: "HEAD",
        headers: { accept: "image/*" },
      },
      { timeoutMs: 4_000, retries: 0 },
    );
    if (validResponse(head)) return imageUrl;
  } catch {
    // Some editorial CDNs do not support HEAD. Try a byte-range request.
  }

  try {
    const response = await fetchWithRetry(
      imageUrl,
      {
        headers: {
          accept: "image/*",
          range: "bytes=0-2047",
        },
      },
      { timeoutMs: 4_000, retries: 0 },
    );
    const valid = validResponse(response);
    await response.body?.cancel();
    return valid ? imageUrl : undefined;
  } catch {
    return undefined;
  }
}
