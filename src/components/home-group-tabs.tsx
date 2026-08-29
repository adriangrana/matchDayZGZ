"use client";

import { useMemo, useState } from "react";
import { TeamMark } from "@/src/components/team-mark";
import {
  sortStandings,
  standingZone,
  standingZoneLabel,
  StandingsZoneLegend,
} from "@/src/components/standings-zones";
import type { Match, StandingEntry } from "@/src/domain/models";
import {
  kickoffLabel,
  madridDateKey,
  matchDateLabel,
} from "@/src/services/sports-presenter";

type GroupKey = "group-2" | "group-1";

interface GroupOverview {
  key: GroupKey;
  label: string;
  matches: Match[];
  standings: StandingEntry[];
  generatedAt: string;
}

function dedupeMatches(matches: Match[]): Match[] {
  return [...new Map(matches.map((match) => [match.id, match])).values()]
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    )
    .slice(0, 10);
}

function updatedLabel(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  })
    .format(new Date(value))
    .replace(".", "");
}

function FixtureCard({ match, todayDate }: { match: Match; todayDate: string }) {
  const finished = match.status === "finished" && Boolean(match.score);
  const matchDate = match.dateBase ?? madridDateKey(match.startsAt);
  const isToday = matchDate === todayDate;

  return (
    <article className={isToday ? "round-fixture-card round-fixture-card-today" : "round-fixture-card"}>
      <div className="round-fixture-meta">
        <span>
          {isToday ? <b className="round-fixture-today">Hoy</b> : null}
          {matchDateLabel(match, true)}
        </span>
        <span className={finished ? "fixture-status fixture-status-finished" : "fixture-status"}>
          {finished ? "Final" : kickoffLabel(match)}
        </span>
      </div>
      <div className="round-fixture-teams">
        <div className="round-fixture-team">
          <TeamMark team={match.homeTeam} size="small" />
          <strong>{match.homeTeam.shortName}</strong>
        </div>
        <div className={finished ? "round-fixture-score" : "round-fixture-versus"}>
          {finished ? (
            <>
              <strong>{match.score?.home}</strong>
              <span>–</span>
              <strong>{match.score?.away}</strong>
            </>
          ) : (
            <span>VS</span>
          )}
        </div>
        <div className="round-fixture-team round-fixture-team-away">
          <TeamMark team={match.awayTeam} size="small" />
          <strong>{match.awayTeam.shortName}</strong>
        </div>
      </div>
    </article>
  );
}

export function HomeGroupTabs({
  groupTwoMatches,
  groupTwoStandings,
  groupTwoGeneratedAt,
  groupOneMatches,
  groupOneStandings,
  groupOneGeneratedAt,
  todayDate,
}: {
  groupTwoMatches: Match[];
  groupTwoStandings: StandingEntry[];
  groupTwoGeneratedAt: string;
  groupOneMatches: Match[];
  groupOneStandings: StandingEntry[];
  groupOneGeneratedAt: string;
  todayDate: string;
}) {
  const [activeKey, setActiveKey] = useState<GroupKey>("group-1");
  const groups = useMemo<GroupOverview[]>(
    () => [
      {
        key: "group-1",
        label: "Grupo I",
        matches: dedupeMatches(groupOneMatches),
        standings: sortStandings(groupOneStandings),
        generatedAt: groupOneGeneratedAt,
      },
      {
        key: "group-2",
        label: "Grupo II",
        matches: dedupeMatches(groupTwoMatches),
        standings: sortStandings(groupTwoStandings),
        generatedAt: groupTwoGeneratedAt,
      },
    ],
    [
      groupOneGeneratedAt,
      groupOneMatches,
      groupOneStandings,
      groupTwoGeneratedAt,
      groupTwoMatches,
      groupTwoStandings,
    ],
  );
  const active = groups.find((group) => group.key === activeKey) ?? groups[0]!;
  const playedMatches = active.matches.filter((match) => match.status === "finished").length;

  return (
    <section className="home-groups-card" aria-label="Jornada de Primera Federación">
      <header className="home-groups-header">
        <div>
          <span className="home-groups-kicker">Primera Federación · 2026/27</span>
          <div className="home-group-tabs" role="tablist" aria-label="Seleccionar grupo">
            {groups.map((group) => (
              <button
                aria-controls="home-group-panel"
                aria-selected={activeKey === group.key}
                className={activeKey === group.key ? "home-group-tab home-group-tab-active" : "home-group-tab"}
                id={`home-tab-${group.key}`}
                key={group.key}
                onClick={() => setActiveKey(group.key)}
                role="tab"
                type="button"
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
        <div className="home-groups-summary">
          <strong>Jornada 1</strong>
          <span>{playedMatches > 0 ? `${playedMatches} resultado confirmado` : "10 partidos"}</span>
        </div>
      </header>

      <div
        aria-labelledby={`home-tab-${active.key}`}
        className="home-groups-content"
        id="home-group-panel"
        role="tabpanel"
      >
        <div className="home-round-fixtures">
          <div className="home-groups-section-title">
            <div>
              <span>Partidos de la jornada</span>
              <strong>{active.label}</strong>
            </div>
            <span>Horario peninsular</span>
          </div>
          {active.matches.length > 0 ? (
            <div className="round-fixtures-grid">
              {active.matches.map((match) => (
                <FixtureCard key={match.id} match={match} todayDate={todayDate} />
              ))}
            </div>
          ) : (
            <div className="home-groups-empty">
              <strong>Calendario pendiente de sincronización</strong>
              <span>Conservaremos aquí el último calendario oficial válido.</span>
            </div>
          )}
        </div>

        <aside className="home-table-preview" aria-label={`Clasificación ${active.label}`}>
          <div className="home-groups-section-title">
            <div>
              <span>Clasificación</span>
              <strong>{active.label}</strong>
            </div>
            <span>PJ · PTS</span>
          </div>
          <StandingsZoneLegend compact />
          <div className="home-table-list">
            {active.standings.slice(0, 8).map((entry, index) => {
              const zone = standingZone(index, active.standings.length);
              return (
              <div className={`home-table-row home-table-row-${zone}`} key={entry.team.id}>
                <span className="home-table-position">{index + 1}<span className="sr-only"> · {standingZoneLabel(zone)}</span></span>
                <TeamMark team={entry.team} size="tiny" />
                <strong>{entry.team.shortName}</strong>
                <span>{entry.played}</span>
                <b>{entry.points}</b>
              </div>
              );
            })}
          </div>
          <a
            className="home-table-link"
            href={`/clasificacion?grupo=${active.key === "group-1" ? "1" : "2"}`}
          >
            Ver clasificación completa <span aria-hidden="true">→</span>
          </a>
        </aside>
      </div>

      <footer className="home-groups-footer">
        <span>Fuente oficial RFEF</span>
        <span>Actualizado {updatedLabel(active.generatedAt)}</span>
      </footer>
    </section>
  );
}
