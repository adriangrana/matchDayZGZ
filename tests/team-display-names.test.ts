import assert from "node:assert/strict";
import test from "node:test";
import { requireGroupTwoTeam } from "../src/data/primera-federacion-teams";

test("Real Zaragoza mantiene su nombre completo en vistas compactas", () => {
  const team = requireGroupTwoTeam("Real Zaragoza");
  assert.equal(team.name, "Real Zaragoza");
  assert.equal(team.shortName, "Real Zaragoza");
});
