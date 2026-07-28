import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

if (process.platform === "win32") {
  const cacheModule = path.resolve(
    "node_modules",
    "vinext",
    "dist",
    "server",
    "static-file-cache.js",
  );
  const source = await readFile(cacheModule, "utf8");
  const windowsUnsafe =
    'relativePath: path.relative(base, batch[j]),';
  const windowsSafe =
    'relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),';

  if (!source.includes(windowsSafe)) {
    if (!source.includes(windowsUnsafe)) {
      throw new Error(
        "No se encontró el índice de archivos estáticos esperado de Vinext.",
      );
    }

    await writeFile(
      cacheModule,
      source.replace(windowsUnsafe, windowsSafe),
      "utf8",
    );
    console.log("[vinext] Rutas estáticas normalizadas para Windows.");
  }
}
