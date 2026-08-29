import assert from "node:assert/strict";
import test from "node:test";
import { getSportsCatalogSnapshot } from "../src/services/sports-catalog";
import { matchDateKey } from "../src/services/sports-presenter";

test("un horario confirmado usa la fecha real y no la fecha base de jornada", () => {
  const base = getSportsCatalogSnapshot().matches[0]!;
  const match = {
    ...base,
    dateBase: "2026-08-30",
    startsAt: "2026-08-29T17:00:00+02:00",
    scheduleStatus: "confirmed" as const,
  };

  assert.equal(matchDateKey(match), "2026-08-29");
});

test("un horario pendiente conserva la fecha base de jornada", () => {
  const base = getSportsCatalogSnapshot().matches[0]!;
  const match = {
    ...base,
    dateBase: "2026-08-30",
    startsAt: "2026-08-30",
    scheduleStatus: "unknown" as const,
  };

  assert.equal(matchDateKey(match), "2026-08-30");
});
