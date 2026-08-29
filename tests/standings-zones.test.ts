import assert from "node:assert/strict";
import test from "node:test";
import type { StandingEntry } from "../src/domain/models";
import { sortStandings, standingZone } from "../src/components/standings-zones";

function entry(name: string, points: number, goalDifference = 0, goalsFor = 0): StandingEntry {
  return {
    position: 0,
    team: { id: name.toLowerCase(), name, shortName: name, abbreviation: name.slice(0, 3) },
    played: 1,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDifference,
    goalDifference,
    points,
  };
}

test("ordena la clasificación por puntos y desempates", () => {
  const sorted = sortStandings([
    entry("Equipo C", 1),
    entry("Equipo A", 3, 1, 2),
    entry("Equipo B", 3, 2, 1),
  ]);

  assert.deepEqual(sorted.map((item) => item.team.name), ["Equipo B", "Equipo A", "Equipo C"]);
  assert.deepEqual(sorted.map((item) => item.position), [1, 2, 3]);
});

test("asigna ascenso, playoff, permanencia y descenso a una liga de 20", () => {
  assert.equal(standingZone(0, 20), "promotion");
  assert.equal(standingZone(1, 20), "playoff");
  assert.equal(standingZone(4, 20), "playoff");
  assert.equal(standingZone(5, 20), "safe");
  assert.equal(standingZone(14, 20), "safe");
  assert.equal(standingZone(15, 20), "relegation");
  assert.equal(standingZone(19, 20), "relegation");
});
