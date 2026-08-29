import { synchronizeFreeSports } from "../src/services/free-sports-sync";

const snapshot = await synchronizeFreeSports();
const nextMatch = snapshot.zaragozaMatches.find(
  (match) =>
    match.status === "scheduled" &&
    new Date(match.startsAt).getTime() >= Date.now() - 3_600_000,
);

console.log(
  JSON.stringify(
    {
      provider: snapshot.provider,
      syncedAt: snapshot.syncedAt,
      requests: snapshot.requestCount,
      sources: snapshot.diagnostics.map((source) => ({
        id: source.id,
        policy: source.policyStatus,
        status: source.httpStatus,
        cache: source.cache,
        extracted: source.extracted,
        error: source.error,
      })),
      calendar: {
        groupMatches: snapshot.matches.length,
        zaragozaMatches: snapshot.zaragozaMatches.length,
        groupOneMatches: snapshot.groupOneMatches?.length ?? 0,
      },
      nextMatch: nextMatch
        ? {
            round: nextMatch.roundLabel,
            date: nextMatch.dateBase,
            kickoffStatus: nextMatch.kickoffStatus,
            home: nextMatch.homeTeam.name,
            away: nextMatch.awayTeam.name,
          }
        : null,
      standings: snapshot.standings.length,
      groupOneStandings: snapshot.groupOneStandings?.length ?? 0,
      reviewRequired: snapshot.reviewRequired,
    },
    null,
    2,
  ),
);
