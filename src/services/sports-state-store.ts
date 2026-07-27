import type {
  DailyRequestUsage,
  Match,
  SportsSyncTimes,
  StandingEntry,
} from "@/src/domain/models";

declare global {
  var __matchDaySportsMemoryStates:
    | Map<string, PersistedSportsState>
    | undefined;
  var __matchDaySportsNonPersistentPaths: Set<string> | undefined;
}

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

export class SportsStatePersistenceError extends Error {
  constructor() {
    super(
      "El runtime web no permite escribir la caché local; se conserva el modo demo y no se consulta API-Football",
    );
    this.name = "SportsStatePersistenceError";
  }
}

function emptyState(): PersistedSportsState {
  return { version: 1, syncTimes: {} };
}

function cloneState(state: PersistedSportsState): PersistedSportsState {
  return structuredClone(state);
}

function memoryStates(): Map<string, PersistedSportsState> {
  globalThis.__matchDaySportsMemoryStates ??= new Map();
  return globalThis.__matchDaySportsMemoryStates;
}

function nonPersistentPaths(): Set<string> {
  globalThis.__matchDaySportsNonPersistentPaths ??= new Set();
  return globalThis.__matchDaySportsNonPersistentPaths;
}

function isRestrictedFileSystemError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  return (
    ["EACCES", "ENOSYS", "EPERM", "EROFS"].includes(code) ||
    /operation not permitted|not implemented|read-only file system/i.test(
      error.message,
    )
  );
}

function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export class SportsStateStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = `${process.cwd()}/.cache/api-football-state.json`,
  ) {}

  isPersistent(): boolean {
    return !nonPersistentPaths().has(this.filePath);
  }

  async read(): Promise<PersistedSportsState> {
    const remembered = memoryStates().get(this.filePath);
    if (remembered) return cloneState(remembered);

    try {
      const { readFile } = await import("node:fs/promises");
      const value = JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as PersistedSportsState;
      const state = value.version === 1 ? value : emptyState();
      memoryStates().set(this.filePath, cloneState(state));
      return state;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code === "ENOENT" || error instanceof SyntaxError) return emptyState();
      if (isRestrictedFileSystemError(error)) {
        nonPersistentPaths().add(this.filePath);
        return emptyState();
      }
      throw error;
    }
  }

  async write(state: PersistedSportsState): Promise<void> {
    const operation = this.queue.then(async () => {
      const persisted = await this.writeDirect(state);
      if (!persisted) {
        memoryStates().set(this.filePath, cloneState(state));
      }
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
      if (!this.isPersistent()) throw new SportsStatePersistenceError();
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
      const persisted = await this.writeDirect(state);
      if (!persisted) throw new SportsStatePersistenceError();
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

  private async writeDirect(state: PersistedSportsState): Promise<boolean> {
    try {
      const { mkdir, rename, writeFile } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporaryPath, this.filePath);
      memoryStates().set(this.filePath, cloneState(state));
      return true;
    } catch (error) {
      if (isRestrictedFileSystemError(error)) {
        nonPersistentPaths().add(this.filePath);
        return false;
      }
      throw error;
    }
  }
}
