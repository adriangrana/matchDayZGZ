"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  persistThemePreference,
  resolveTheme,
  storedThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/src/services/theme";

const themeChangeEvent = "matchday-theme-change";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
  };
}

function getPreference(): ThemePreference {
  return storedThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
}

function applyPreference(preference: ThemePreference): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const applyResolved = () => {
    const resolved = resolveTheme(preference, media.matches);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
  };

  if (preference === "system") {
    media.addEventListener("change", applyResolved);
  }
  applyResolved();
  return () => media.removeEventListener("change", applyResolved);
}

export function ThemeSelector() {
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    (): ThemePreference => "system",
  );

  useEffect(() => applyPreference(preference), [preference]);

  return (
    <label className="theme-selector">
      <span className="sr-only">Tema de color</span>
      <select
        aria-label="Tema de color"
        onChange={(event) => {
          persistThemePreference(
            event.target.value as ThemePreference,
            window.localStorage,
          );
          window.dispatchEvent(new Event(themeChangeEvent));
        }}
        value={preference}
      >
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </select>
    </label>
  );
}
