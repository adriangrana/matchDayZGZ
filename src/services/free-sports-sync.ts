import { FreeSportsAggregator } from "@/src/services/free-sports-aggregator";
import { applyLiveScoreOverlay } from "@/src/services/live-score-overlay";
import { FreeSportsSnapshotStore } from "@/src/services/free-sports-snapshot-store";
import { sanitizeSportsSnapshot } from "@/src/services/sports-snapshot-sanitizer";
import { rfefFallbackMatches } from "@/src/services/sports-catalog";

declare global {
  var __matchDayFreeSportsSync:
    | ReturnType<FreeSportsAggregator["sync"]>
    | undefined;
}

export function synchronizeFreeSports(options: {
  now?: Date;
  force?: boolean;
} = {}) {
  if (globalThis.__matchDayFreeSportsSync) {
    return globalThis.__matchDayFreeSportsSync;
  }

  const operation = new FreeSportsAggregator(rfefFallbackMatches)
    .sync(options)
    .then(async (snapshot) => {
      const overlaid = await applyLiveScoreOverlay(snapshot, { now: options.now });
      const sanitized = sanitizeSportsSnapshot(overlaid, { now: options.now });
      await new FreeSportsSnapshotStore().write(sanitized);
      return sanitized;
    })
    .finally(() => {
      globalThis.__matchDayFreeSportsSync = undefined;
    });
  globalThis.__matchDayFreeSportsSync = operation;
  return operation;
}
