import { FreeSportsAggregator } from "../src/services/free-sports-aggregator";
import { rfefFallbackMatches } from "../src/services/free-sports-dashboard";

const aggregator = new FreeSportsAggregator(rfefFallbackMatches);
const snapshot = await aggregator.sync();
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
      reviewRequired: snapshot.reviewRequired,
    },
    null,
    2,
  ),
);

