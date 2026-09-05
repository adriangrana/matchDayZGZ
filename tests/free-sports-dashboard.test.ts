import assert from "node:assert/strict";
import test from "node:test";
import { isGroupOverviewCurrentOrUpcoming } from "../src/services/free-sports-dashboard";

test("la jornada conserva partidos en vivo además de los programados", () => {
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "live" }), true);
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "scheduled" }), true);
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "finished" }), false);
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "postponed" }), false);
});

test("no muestra como próximos los partidos programados que ya quedaron atrás", () => {
  const now = new Date("2026-09-05T11:32:00.000Z");
  assert.equal(
    isGroupOverviewCurrentOrUpcoming(
      { status: "scheduled", startsAt: "2026-08-30T19:15:00.000Z" },
      now,
    ),
    false,
  );
  assert.equal(
    isGroupOverviewCurrentOrUpcoming(
      { status: "scheduled", startsAt: "2026-09-05T19:00:00.000Z" },
      now,
    ),
    true,
  );
});
