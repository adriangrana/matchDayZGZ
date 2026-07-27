import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { FreeSportsInspection } from "@/src/providers/free-sports-types";

export class FreeSportsSnapshotStore {
  constructor(
    private readonly filePath = join(
      process.cwd(),
      ".cache",
      "free-sports-snapshot.json",
    ),
  ) {}

  async read(): Promise<FreeSportsInspection | undefined> {
    try {
      const parsed = JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as FreeSportsInspection;
      return parsed.provider === "free-web" ? parsed : undefined;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code === "ENOENT" || error instanceof SyntaxError) return undefined;
      throw error;
    }
  }

  async write(snapshot: FreeSportsInspection): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, this.filePath);
  }
}

