import assert from "node:assert/strict";
import test from "node:test";
import { getFreshness } from "../src/services/freshness";

test("clasifica un dato reciente como fresco", () => {
  assert.equal(
    getFreshness(
      "2026-07-27T19:00:00.000Z",
      new Date("2026-07-27T20:00:00.000Z"),
      90,
    ),
    "fresh",
  );
});

test("clasifica un dato antiguo como desactualizado", () => {
  assert.equal(
    getFreshness(
      "2026-07-27T17:00:00.000Z",
      new Date("2026-07-27T20:00:00.000Z"),
      90,
    ),
    "stale",
  );
});

test("devuelve unknown ante una fecha inválida", () => {
  assert.equal(getFreshness("sin-fecha"), "unknown");
});

