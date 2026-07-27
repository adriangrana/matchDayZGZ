import type {
  DailyRequestUsage,
  Match,
  SportsSyncTimes,
  StandingEntry,
} from "@/src/domain/models";

export interface SportsProviderMetadata {
  teamId: number;
  teamName: string;
  leagueId: number;
  leagueName: string;
  season: number;
}

export interface PersistedSportsState {
  version: 1;
  usage?: {
    date: string;
    used: number;
  };
  metadata?: SportsProviderMetadata;
  matches?: Match[];
  standings?: StandingEntry[];
  syncTimes: SportsSyncTimes;
  syncedAt?: string;
}

export class SportsRequestLimitError extends Error {
  constructor(
    readonly usage: DailyRequestUsage,
  ) {
    super(
      `Límite interno diario alcanzado (${usage.used}/${usage.limit} solicitudes)`,
    );
    this.name = "SportsRequestLimitError";
  }
}

function emptyState(): PersistedSportsState {
  return { version: 1, syncTimes: {} };
}

function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export class SportsStateStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = `${process.cwd()}/.cache/api-football-state.json`,
  ) {}

  async read(): Promise<PersistedSportsState> {
    try {
      const { readFile } = await import("node:fs/promises");
      const value = JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as PersistedSportsState;
      return value.version === 1 ? value : emptyState();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code === "ENOENT" || error instanceof SyntaxError) return emptyState();
      throw error;
    }
  }

  async write(state: PersistedSportsState): Promise<void> {
    const operation = this.queue.then(async () => {
      const { mkdir, rename, writeFile } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporaryPath, this.filePath);
    });
    this.queue = operation.catch(() => undefined);
    await operation;
  }

  async getUsage(
    limit: number,
    now = new Date(),
  ): Promise<DailyRequestUsage> {
    const state = await this.read();
    const date = utcDate(now);
    const used = state.usage?.date === date ? state.usage.used : 0;
    return {
      date,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  async reserveRequest(
    limit: number,
    now = new Date(),
  ): Promise<DailyRequestUsage> {
    let result: DailyRequestUsage | undefined;
    const operation = this.queue.then(async () => {
      const state = await this.read();
      const date = utcDate(now);
      const used = state.usage?.date === date ? state.usage.used : 0;
      const current = {
        date,
        used,
        limit,
        remaining: Math.max(0, limit - used),
      };
      if (used >= limit) throw new SportsRequestLimitError(current);

      const nextUsed = used + 1;
      state.usage = { date, used: nextUsed };
      await this.writeDirect(state);
      result = {
        date,
        used: nextUsed,
        limit,
        remaining: Math.max(0, limit - nextUsed),
      };
    });
    this.queue = operation.catch(() => undefined);
    await operation;
    return result!;
  }

  private async writeDirect(state: PersistedSportsState): Promise<void> {
    const { mkdir, rename, writeFile } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, this.filePath);
  }
}
