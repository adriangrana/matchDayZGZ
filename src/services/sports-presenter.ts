import type { Match } from "@/src/domain/models";

const placeholderHours = new Set(["00:00", "02:00", "12:00"]);

function dateFromBase(match: Match): Date {
  const base = match.dateBase ?? match.startsAt.slice(0, 10);
  return new Date(`${base}T12:00:00Z`);
}

function localClock(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function isConfirmedKickoff(match: Match): boolean {
  if (match.scheduleStatus !== "confirmed") return false;
  if (Number.isNaN(new Date(match.startsAt).getTime())) return false;

  const onlyPdfSource = match.source.id === "rfef-calendar-pdf";
  return !(onlyPdfSource && placeholderHours.has(localClock(match.startsAt)));
}

export function kickoffLabel(match: Match): string {
  return isConfirmedKickoff(match)
    ? localClock(match.startsAt)
    : "Horario pendiente";
}

export function matchDateLabel(match: Match, compact = false): string {
  if (isConfirmedKickoff(match)) {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: compact ? undefined : "short",
      day: "numeric",
      month: compact ? "short" : "long",
      timeZone: "Europe/Madrid",
    })
      .format(new Date(match.startsAt))
      .replace(".", "");
  }

  const date = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: compact ? "short" : "long",
    timeZone: "UTC",
  })
    .format(dateFromBase(match))
    .replace(".", "");
  return compact ? `F. base ${date}` : `Fin de semana del ${date}`;
}

export function scheduleLabel(match: Match): string {
  return isConfirmedKickoff(match)
    ? "Fecha y horario confirmados"
    : "Fecha base de jornada";
}

export function venueLabel(match: Match): string {
  return match.venue?.trim() || "Estadio por confirmar";
}

export function competitionCategory(
  match: Match,
): "league" | "cup" | "friendly" {
  const value = `${match.competition.name} ${match.round}`.toLowerCase();
  if (value.includes("copa")) return "cup";
  if (value.includes("amistoso") || value.includes("friendly")) {
    return "friendly";
  }
  return "league";
}

export function resultLabel(match: Match): string {
  if (match.status !== "finished" || !match.score) return "—";
  return `${match.score.home}–${match.score.away}`;
}
