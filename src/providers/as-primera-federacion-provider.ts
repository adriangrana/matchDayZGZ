import type {
  NormalizedGroupMatch,
  SourceDiagnostic,
} from "@/src/providers/free-sports-types";

const AS_RESULTS_URL =
  "https://as.com/resultados/futbol/primera_rfef/";

export interface ParsedKickoff {
  value?: string;
  status: "confirmed" | "provisional" | "unknown";
  discardedAsPlaceholder: boolean;
}

export function classifyRoundKickoffs(times: string[]): ParsedKickoff[] {
  const normalized = times.map((time) => time.trim().slice(0, 5));
  const allSameGeneric =
    normalized.length >= 5 &&
    new Set(normalized).size === 1 &&
    normalized[0] === "02:00";

  return normalized.map((time) => {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return {
        status: "unknown" as const,
        discardedAsPlaceholder: false,
      };
    }
    if (allSameGeneric) {
      return {
        status: "provisional" as const,
        discardedAsPlaceholder: true,
      };
    }
    return {
      value: time,
      status: "confirmed" as const,
      discardedAsPlaceholder: false,
    };
  });
}

export class AsPrimeraFederacionProvider {
  readonly id = "as-primera-federacion";

  inspect(now = new Date()): {
    matches: NormalizedGroupMatch[];
    diagnostic: SourceDiagnostic;
  } {
    return {
      matches: [],
      diagnostic: {
        id: this.id,
        name: "AS Primera Federación",
        url: AS_RESULTS_URL,
        policyStatus: "blocked-by-terms",
        cache: "disabled",
        extracted: { matches: 0, standings: 0 },
        placeholderKickoffsDiscarded: 0,
        checkedAt: now.toISOString(),
        error:
          "Scraping desactivado: el aviso legal de AS reserva expresamente el uso mediante lectura mecánica",
      },
    };
  }
}

