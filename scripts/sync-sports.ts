import { forceSportsSync } from "../src/services/sports-service";

const snapshot = await forceSportsSync();

console.log(
  JSON.stringify(
    {
      mode: snapshot.mode,
      stale: snapshot.stale,
      syncedAt: snapshot.generatedAt,
      fixturesSyncedAt: snapshot.syncTimes.fixtures,
      standingsSyncedAt: snapshot.syncTimes.standings,
      metadataSyncedAt: snapshot.syncTimes.metadata,
      recentMatches: snapshot.recentMatches.length,
      upcomingMatches: snapshot.upcomingMatches.length,
      standings: snapshot.standings.length,
      requests: snapshot.requestUsage,
      sourceErrors: snapshot.sourceErrors,
    },
    null,
    2,
  ),
);

