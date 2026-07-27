import { FreeSportsAggregator } from "../src/services/free-sports-aggregator";
import { rfefFallbackMatches } from "../src/services/free-sports-dashboard";

const aggregator = new FreeSportsAggregator(rfefFallbackMatches);
const snapshot = (await aggregator.inspect()) ?? (await aggregator.sync());
const nextMatch = snapshot.zaragozaMatches.find(
  (match) =>
    match.status === "scheduled" &&
    new Date(match.startsAt).getTime() >= Date.now() - 3_600_000,
);
const results = snapshot.matches.filter(
  (match) => match.status === "finished" && match.score,
);

console.log(
  JSON.stringify(
    {
      provider: snapshot.provider,
      sourcesConsulted: snapshot.diagnostics.map((source) => ({
        id: source.id,
        name: source.name,
        url: source.url,
        policy: source.policyStatus,
        httpStatus: source.httpStatus,
        durationMs: source.durationMs,
        cache: source.cache,
        extracted: source.extracted,
        placeholderKickoffsDiscarded:
          source.placeholderKickoffsDiscarded,
        error: source.error,
      })),
      nextMatchDetected: nextMatch ?? null,
      resultsDetected: results,
      computedStandings: snapshot.standings,
      publishedStandings: snapshot.publishedStandings ?? null,
      differences: snapshot.differences,
      reviewRequired: snapshot.reviewRequired,
      lastUpdate: snapshot.syncedAt,
      totalRequests: snapshot.requestCount,
    },
    null,
    2,
  ),
);

