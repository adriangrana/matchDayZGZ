import assert from "node:assert/strict";
import test from "node:test";
import { DemoMatchDayProvider } from "../src/providers/demo-match-day-provider";

test("el proveedor demo devuelve un snapshot completo e identificado", async () => {
  const snapshot = await new DemoMatchDayProvider().getSnapshot();

  assert.equal(snapshot.isDemo, true);
  assert.equal(snapshot.nextMatch.homeTeam.id, "real-zaragoza");
  assert.ok(snapshot.recentMatches.length >= 3);
  assert.ok(snapshot.upcomingMatches.length >= 3);
  assert.ok(snapshot.standings.some((entry) => entry.team.id === "real-zaragoza"));
  assert.ok(snapshot.news.every((article) => article.source.id === "demo-local"));
});

