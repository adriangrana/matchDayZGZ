"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "@/src/components/header-controls.module.css";

type SyncState = "idle" | "syncing" | "success" | "partial" | "error";

const labels: Record<SyncState, string> = {
  idle: "Actualizar",
  syncing: "Actualizando",
  success: "Actualizado",
  partial: "Actualización parcial",
  error: "Reintentar",
};

const stateClass: Record<SyncState, string> = {
  idle: "",
  syncing: styles.syncing,
  success: styles.success,
  partial: styles.partial,
  error: styles.error,
};

export function SyncButton() {
  const available = useSyncExternalStore(
    () => () => undefined,
    () =>
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "::1",
    () => false,
  );
  const [state, setState] = useState<SyncState>("idle");

  if (!available) return null;

  async function synchronize() {
    setState("syncing");
    try {
      const response = await fetch("/api/local/sync", {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        partial?: boolean;
      };
      if (!response.ok) throw new Error("sync-failed");
      setState(payload.partial ? "partial" : "success");
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setState("error");
    }
  }

  return (
    <button
      aria-busy={state === "syncing"}
      aria-label={labels[state]}
      className={`${styles.syncButton} ${stateClass[state]}`.trim()}
      disabled={state === "syncing"}
      onClick={synchronize}
      title="Sincronizar ahora noticias y datos deportivos"
      type="button"
    >
      <span className={styles.syncIconBox} aria-hidden="true">
        <svg
          className={styles.syncIcon}
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 7v5h-5M4 17v-5h5M6.1 8.3A7 7 0 0 1 18.7 7M17.9 15.7A7 7 0 0 1 5.3 17"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <span className={styles.syncLabel} aria-live="polite">
        {labels[state]}
      </span>
    </button>
  );
}
