"use client";

import { useEffect, useState } from "react";

type SyncState = "idle" | "syncing" | "success" | "partial" | "error";

const labels: Record<SyncState, string> = {
  idle: "Sync",
  syncing: "Sincronizando",
  success: "Actualizado",
  partial: "Actualización parcial",
  error: "Reintentar",
};

export function SyncButton() {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<SyncState>("idle");

  useEffect(() => {
    setAvailable(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "::1",
    );
  }, []);

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
      className={`sync-button sync-button-${state}`}
      disabled={state === "syncing"}
      onClick={synchronize}
      title="Sincronizar ahora noticias y datos deportivos"
      type="button"
    >
      <span className="sync-button-icon" aria-hidden="true">↻</span>
      <span className="sync-button-label" aria-live="polite">{labels[state]}</span>
    </button>
  );
}
