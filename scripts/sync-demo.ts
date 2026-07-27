import { DemoMatchDayProvider } from "../src/providers/demo-match-day-provider";

const provider = new DemoMatchDayProvider();
const snapshot = await provider.getSnapshot();

console.log(
  JSON.stringify(
    {
      provider: provider.id,
      demo: snapshot.isDemo,
      nextMatch: snapshot.nextMatch.id,
      recentMatches: snapshot.recentMatches.length,
      upcomingMatches: snapshot.upcomingMatches.length,
      standings: snapshot.standings.length,
      news: snapshot.news.length,
      generatedAt: snapshot.generatedAt,
    },
    null,
    2,
  ),
);

