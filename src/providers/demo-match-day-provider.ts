import { demoSnapshot } from "@/src/data/demo";
import type { MatchDaySnapshot } from "@/src/domain/models";
import type {
  MatchDayProvider,
  ProviderContext,
} from "@/src/providers/match-day-provider";

export class DemoMatchDayProvider implements MatchDayProvider {
  readonly id = "demo";

  async getSnapshot(
    context: ProviderContext = {},
  ): Promise<MatchDaySnapshot> {
    context.signal?.throwIfAborted();
    return structuredClone(demoSnapshot);
  }
}
