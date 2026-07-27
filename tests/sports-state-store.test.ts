import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  SportsRequestLimitError,
  SportsStateStore,
} from "../src/services/sports-state-store";

test("registra consumo y bloquea antes de superar el límite diario", async () => {
  const directory = await mkdtemp(join(tmpdir(), "matchday-sports-"));
  const store = new SportsStateStore(join(directory, "state.json"));
  const now = new Date("2026-07-28T08:00:00.000Z");

  try {
    assert.equal((await store.reserveRequest(2, now)).used, 1);
    assert.equal((await store.reserveRequest(2, now)).used, 2);
    await assert.rejects(
      () => store.reserveRequest(2, now),
      SportsRequestLimitError,
    );
    assert.deepEqual(await store.getUsage(2, now), {
      date: "2026-07-28",
      used: 2,
      limit: 2,
      remaining: 0,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reinicia el contador al cambiar el día UTC", async () => {
  const directory = await mkdtemp(join(tmpdir(), "matchday-sports-"));
  const store = new SportsStateStore(join(directory, "state.json"));

  try {
    await store.reserveRequest(50, new Date("2026-07-28T23:59:00.000Z"));
    const nextDay = await store.reserveRequest(
      50,
      new Date("2026-07-29T00:01:00.000Z"),
    );
    assert.equal(nextDay.used, 1);
    assert.equal(nextDay.date, "2026-07-29");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

