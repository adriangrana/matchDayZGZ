import { TheSportsDbBrandingProvider } from "../src/providers/thesportsdb-branding-provider";

const snapshot = await new TheSportsDbBrandingProvider().sync({
  force: process.argv.includes("--force"),
});

console.log(
  JSON.stringify(
    {
      provider: snapshot.provider,
      syncedAt: snapshot.syncedAt,
      refreshAfter: snapshot.refreshAfter,
      teamsProcessed: snapshot.stats.processed,
      badgesFound: snapshot.stats.found,
      badgesValidated: snapshot.stats.validated,
      badgesRejected: snapshot.stats.rejected,
      ambiguousMatches: snapshot.stats.ambiguous,
      teamsWithoutBadge: snapshot.stats.missing,
      requests: snapshot.stats.requests,
      fromCache: snapshot.stats.fromCache,
      pendingTeams: snapshot.records
        .filter((record) => record.validation !== "validated")
        .map((record) => ({
          team: record.canonicalName,
          status: record.validation,
          reason: record.reason,
        })),
    },
    null,
    2,
  ),
);
