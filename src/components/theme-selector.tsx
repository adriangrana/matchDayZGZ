"use client";

import { useEffect, useSyncExternalStore } from "react";
import styles from "@/src/components/header-controls.module.css";
import {
  persistThemePreference,
  resolveTheme,
  storedThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/src/services/theme";

const themeChangeEvent = "matchday-theme-change";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: "sun" | "system" | "moon";
}> = [
  { value: "light", label: "Tema claro", icon: "sun" },
  { value: "system", label: "Usar tema del sistema", icon: "system" },
  { value: "dark", label: "Tema oscuro", icon: "moon" },
];

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

function ThemeIcon({ icon }: { icon: "sun" | "system" | "moon" }) {
  if (icon === "sun") {
    return (
      <svg
        className={styles.themeIcon}
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 2.8v2M12 19.2v2M21.2 12h-2M4.8 12h-2M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4M18.5 18.5l-1.4-1.4M6.9 6.9 5.5 5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (icon === "moon") {
    return (
      <svg
        className={styles.themeIcon}
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19.3 15.2A7.7 7.7 0 0 1 8.8 4.7 7.8 7.8 0 1 0 19.3 15.2Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  return (
    <svg
      className={styles.themeIcon}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="11.5"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.7"
        width="16"
        x="4"
        y="4.5"
      />
      <path
        d="M9 19.5h6M12 16v3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ThemeSelector() {
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    (): ThemePreference => "system",
  );

  useEffect(() => applyPreference(preference), [preference]);

  function selectTheme(nextPreference: ThemePreference) {
    persistThemePreference(nextPreference, window.localStorage);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return (
    <div className={styles.themeSelector} role="group" aria-label="Tema de color">
      {themeOptions.map((option) => {
        const active = preference === option.value;
        return (
          <button
            aria-label={option.label}
            aria-pressed={active}
            className={`${styles.themeOption} ${active ? styles.themeOptionActive : ""}`.trim()}
            key={option.value}
            onClick={() => selectTheme(option.value)}
            title={option.label}
            type="button"
          >
            <ThemeIcon icon={option.icon} />
          </button>
        );
      })}
    </div>
  );
}
