import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  persistThemePreference,
  resolveTheme,
  storedThemePreference,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
} from "../src/services/theme";

test("Sistema resuelve el tema actual del sistema operativo", () => {
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("system", true), "dark");
});

test("los cambios del sistema actualizan el resultado cuando se usa Sistema", () => {
  const before = resolveTheme("system", false);
  const after = resolveTheme("system", true);
  assert.equal(before, "light");
  assert.equal(after, "dark");
});

test("la elección manual prevalece sobre el sistema", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("volver a Sistema elimina la preferencia manual", () => {
  const values = new Map<string, string>();
  const storage = {
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };

  persistThemePreference("dark", storage);
  assert.equal(values.get(THEME_STORAGE_KEY), "dark");
  persistThemePreference("system", storage);
  assert.equal(values.has(THEME_STORAGE_KEY), false);
  assert.equal(storedThemePreference(null), "system");
});

test("el script de arranque aplica el tema antes de renderizar la aplicación", async () => {
  const layout = await readFile(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );
  assert.match(layout, /<head>[\s\S]*THEME_INIT_SCRIPT[\s\S]*<\/head>/);
  assert.match(THEME_INIT_SCRIPT, /document\.documentElement\.dataset\.theme/);
  assert.match(THEME_INIT_SCRIPT, /prefers-color-scheme: dark/);
  assert.match(layout, /suppressHydrationWarning/);
});

test("los componentes usan tokens semánticos y contemplan ambos temas", async () => {
  const [css, header] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/header.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  for (const token of [
    "--background",
    "--foreground",
    "--surface",
    "--surface-elevated",
    "--border",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--success",
    "--warning",
    "--danger",
  ]) {
    assert.ok(css.includes(token), `Falta el token ${token}`);
  }
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /color-scheme: light/);
  assert.match(css, /color-scheme: dark/);
  assert.match(header, /<ThemeSelector/);
});
