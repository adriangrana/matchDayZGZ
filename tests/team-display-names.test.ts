import assert from "node:assert/strict";
import test from "node:test";
import {
  requireGroupOneTeam,
  requireGroupTwoTeam,
} from "../src/data/primera-federacion-teams";

test("Real Zaragoza mantiene su nombre completo en vistas compactas", () => {
  const team = requireGroupTwoTeam("Real Zaragoza");
  assert.equal(team.name, "Real Zaragoza");
  assert.equal(team.shortName, "Real Zaragoza");
});

test("Cultural Leonesa conserva un nombre reconocible y el id histórico", () => {
  const team = requireGroupOneTeam("CyD Leonesa");
  assert.equal(team.id, "cyd-leonesa");
  assert.equal(team.name, "Cultural y Deportiva Leonesa");
  assert.equal(team.shortName, "Cultural Leonesa");
});
