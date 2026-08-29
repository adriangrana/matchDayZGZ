import { FreeSportsAggregator } from "@/src/services/free-sports-aggregator";
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
    .finally(() => {
      globalThis.__matchDayFreeSportsSync = undefined;
    });
  globalThis.__matchDayFreeSportsSync = operation;
  return operation;
}
