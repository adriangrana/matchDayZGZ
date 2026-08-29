import { groupOneTeams } from "../src/data/primera-federacion-teams";
import { TheSportsDbBrandingProvider } from "../src/providers/thesportsdb-branding-provider";

const snapshot = await new TheSportsDbBrandingProvider(
  ".cache/team-branding-group1.json",
  "src/data/team-branding-group1-snapshot.json",
  fetch,
  "public/team-badges",
  groupOneTeams,
).sync({ force: process.argv.includes("--force") });

console.log(JSON.stringify({
  provider: snapshot.provider,
  syncedAt: snapshot.syncedAt,
  teamsProcessed: snapshot.stats.processed,
  badgesValidated: snapshot.stats.validated,
  teamsWithoutBadge: snapshot.stats.missing,
  requests: snapshot.stats.requests,
}, null, 2));
