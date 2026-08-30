import assert from "node:assert/strict";
import test from "node:test";
import { isGroupOverviewCurrentOrUpcoming } from "../src/services/free-sports-dashboard";

test("la jornada conserva partidos en vivo además de los programados", () => {
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "live" }), true);
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "scheduled" }), true);
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "finished" }), false);
  assert.equal(isGroupOverviewCurrentOrUpcoming({ status: "postponed" }), false);
});
