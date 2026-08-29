import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedLocalSyncRequest } from "../src/services/local-sync-access";

test("permite sincronización manual desde el mismo origen local", () => {
  const request = new Request("http://127.0.0.1:3100/api/local/sync", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3100" },
  });
  assert.equal(isAuthorizedLocalSyncRequest(request), true);
});

test("rechaza el túnel público y orígenes distintos", () => {
  assert.equal(
    isAuthorizedLocalSyncRequest(
      new Request("https://example.trycloudflare.com/api/local/sync", {
        method: "POST",
        headers: { origin: "https://example.trycloudflare.com" },
      }),
    ),
    false,
  );
  assert.equal(
    isAuthorizedLocalSyncRequest(
      new Request("http://127.0.0.1:3100/api/local/sync", {
        method: "POST",
        headers: { origin: "https://example.com" },
      }),
    ),
    false,
  );
});
