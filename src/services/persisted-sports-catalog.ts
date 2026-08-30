import type {
  SportsCatalogSnapshot,
  StandingEntry,
  SportsGroupSnapshot,
} from "@/src/domain/models";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
} from "@/src/providers/free-sports-types";
import { validateRfefCalendar } from "@/src/providers/rfef-pdf-calendar-provider";
import {
  createSportsCatalogSnapshot,
  createSportsGroupSnapshot,
  getSportsCatalogSnapshot,
} from "@/src/services/sports-catalog";
import { FreeSportsSnapshotStore } from "@/src/services/free-sports-snapshot-store";
import { withRuntimeMatchStatuses } from "@/src/services/runtime-match-status";

function diagnosticErrors(snapshot: FreeSportsInspection): string[] {
  return snapshot.diagnostics
    .filter(
      (diagnostic) =>
        diagnostic.policyStatus !== "blocked-by-terms" &&
        Boolean(diagnostic.error),
    )
    .map(
      (diagnostic) =>
        `${diagnostic.name}: ${diagnostic.error ?? "fuente no disponible"}`,
    );
}

function isStale(snapshot: FreeSportsInspection): boolean {
  const calendar = snapshot.diagnostics.find(
    (diagnostic) => diagnostic.id === "rfef-calendar-pdf",
  );
  const official = snapshot.diagnostics.filter((diagnostic) =>
    diagnostic.id.startsWith("real-zaragoza-official-"),
  );

  return (
    calendar?.policyStatus === "unavailable" ||
    calendar?.cache === "stale" ||
    (official.length > 0 &&
      official.every(
        (diagnostic) =>
          diagnostic.policyStatus === "unavailable" ||
          diagnostic.cache === "stale",
      ))
  );
}

export interface SportsCatalogCollection {
  groupTwo: SportsCatalogSnapshot;
  groupOne: SportsGroupSnapshot;
}

export function catalogFromInspection(
  snapshot: FreeSportsInspection,
): SportsCatalogSnapshot {
  const calendar = snapshot.matches.filter(
    (match) =>
      match.round > 0 &&
      match.sources.some((source) => source.id === "rfef-calendar-pdf"),
  );
  validateRfefCalendar(calendar);

  return {
    ...createSportsCatalogSnapshot(
      snapshot.matches as NormalizedGroupMatch[],
      snapshot.syncedAt,
      snapshot.standings as StandingEntry[],
    ),
    stale: isStale(snapshot),
    sourceErrors: diagnosticErrors(snapshot),
  };
}

export function catalogCollectionFromInspection(
  snapshot: FreeSportsInspection,
): SportsCatalogCollection {
  const groupTwo = catalogFromInspection(snapshot);
  const groupOneMatches = snapshot.groupOneMatches ?? [];
  const groupOneDiagnostic = snapshot.diagnostics.find(
    (diagnostic) => diagnostic.id === "rfef-calendar-pdf-group-1",
  );
  const groupOne = createSportsGroupSnapshot(
    groupOneMatches,
    "group-1",
    snapshot.syncedAt,
    snapshot.groupOneStandings,
    {
      stale:
        groupOneDiagnostic?.policyStatus === "unavailable" ||
        groupOneDiagnostic?.cache === "stale",
      sourceErrors: groupOneDiagnostic?.error
        ? [`${groupOneDiagnostic.name}: ${groupOneDiagnostic.error}`]
        : [],
    },
  );
  return { groupTwo, groupOne };
}

function withRuntimeStatuses(
  collection: SportsCatalogCollection,
  now = new Date(),
): SportsCatalogCollection {
  return {
    groupTwo: {
      ...collection.groupTwo,
      matches: withRuntimeMatchStatuses(collection.groupTwo.matches, now),
      allMatches: withRuntimeMatchStatuses(collection.groupTwo.allMatches, now),
    },
    groupOne: {
      ...collection.groupOne,
      matches: withRuntimeMatchStatuses(collection.groupOne.matches, now),
    },
  };
}

function emptyGroupOneSnapshot(now = new Date().toISOString()): SportsGroupSnapshot {
  return createSportsGroupSnapshot([], "group-1", now, undefined, {
    stale: true,
    sourceErrors: ["El calendario del Grupo I aún no se ha sincronizado"],
  });
}

export async function getPersistedSportsCatalogCollection(
  store = new FreeSportsSnapshotStore(),
): Promise<SportsCatalogCollection> {
  const now = new Date();
  try {
    const persisted = await store.read();
    const collection = persisted
      ? catalogCollectionFromInspection(persisted)
      : { groupTwo: getSportsCatalogSnapshot(), groupOne: emptyGroupOneSnapshot() };
    return withRuntimeStatuses(collection, now);
  } catch (error) {
    const fallback = getSportsCatalogSnapshot();
    return withRuntimeStatuses(
      {
        groupTwo: {
          ...fallback,
          stale: true,
          sourceErrors: [
            error instanceof Error
              ? `No se pudo leer el snapshot actualizado: ${error.message}`
              : "No se pudo leer el snapshot actualizado",
          ],
        },
        groupOne: emptyGroupOneSnapshot(),
      },
      now,
    );
  }
}

export async function getPersistedSportsCatalogSnapshot(
  store = new FreeSportsSnapshotStore(),
): Promise<SportsCatalogSnapshot> {
  return (await getPersistedSportsCatalogCollection(store)).groupTwo;
}
