export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "matchday-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

export function storedThemePreference(
  value: string | null,
): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function persistThemePreference(
  preference: ThemePreference,
  storage: Pick<Storage, "setItem" | "removeItem">,
): void {
  if (preference === "system") {
    storage.removeItem(THEME_STORAGE_KEY);
  } else {
    storage.setItem(THEME_STORAGE_KEY, preference);
  }
}

export const THEME_INIT_SCRIPT = `
(() => {
  try {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const stored = localStorage.getItem(key);
    const preference = stored === "light" || stored === "dark" ? stored : "system";
    const resolved = preference === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
  } catch {
    const resolved = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = "system";
    document.documentElement.style.colorScheme = resolved;
  }
})();
`;
