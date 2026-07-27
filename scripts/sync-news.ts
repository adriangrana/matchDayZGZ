import { forceNewsSync } from "../src/services/news-service";

const snapshot = await forceNewsSync();

console.log(
  JSON.stringify(
    {
      mode: snapshot.mode,
      syncedAt: snapshot.syncedAt,
      groups: snapshot.groups.length,
      articles:
        snapshot.groups.length +
        snapshot.groups.reduce(
          (total, group) => total + group.related.length,
          0,
        ),
      sourceErrors: snapshot.sourceErrors,
      preview: snapshot.groups.slice(0, 3).map((group) => ({
        title: group.primary.title,
        source: group.primary.source.name,
        relatedSources: group.sourceCount,
      })),
    },
    null,
    2,
  ),
);

