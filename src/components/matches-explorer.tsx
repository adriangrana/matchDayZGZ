"use client";

import { useEffect, useMemo, useState } from "react";
import { TeamMark } from "@/src/components/team-mark";
import type { Match } from "@/src/domain/models";
import {
  filterMatchesByCriteria,
  finishedByCompetition,
  groupMatches,
  type CompetitionFilter,
  type MatchConditionFilter,
  type MatchStateFilter,
  type MatchView,
} from "@/src/services/match-filters";
import {
  isConfirmedKickoff,
  kickoffLabel,
  matchDateLabel,
  resultLabel,
  scheduleLabel,
  venueLabel,
} from "@/src/services/sports-presenter";

const competitionFilters: Array<[CompetitionFilter, string]> = [
  ["all", "Todas"],
  ["league", "Primera Federación"],
  ["cup", "Copa del Rey"],
  ["friendly", "Amistosos"],
];
const stateFilters: Array<[MatchStateFilter, string]> = [
  ["all", "Todos"],
  ["upcoming", "Próximos"],
  ["finished", "Finalizados"],
];
const conditionFilters: Array<[MatchConditionFilter, string]> = [
  ["all", "Todos"],
  ["home", "Local"],
  ["away", "Visitante"],
];
const viewFilters: Array<[MatchView, string]> = [
  ["month", "Meses"],
  ["round", "Jornadas"],
];

const validCompetitions = new Set(competitionFilters.map(([value]) => value));
const validStates = new Set(stateFilters.map(([value]) => value));
const validConditions = new Set(conditionFilters.map(([value]) => value));
const validViews = new Set(viewFilters.map(([value]) => value));

type MatchOutcome = "win" | "draw" | "loss";

export function matchOutcome(match: Match): MatchOutcome | undefined {
  if (match.status !== "finished" || !match.score) return undefined;
  const zaragozaIsHome = match.homeTeam.id === "real-zaragoza";
  const zaragozaScore = zaragozaIsHome ? match.score.home : match.score.away;
  const rivalScore = zaragozaIsHome ? match.score.away : match.score.home;
  if (zaragozaScore === rivalScore) return "draw";
  return zaragozaScore > rivalScore ? "win" : "loss";
}

function outcomeLabel(outcome: MatchOutcome): string {
  if (outcome === "win") return "Victoria";
  if (outcome === "draw") return "Empate";
  return "Derrota";
}

function roundAbbreviation(round: string): string {
  return round.replace(/^Jornada\s+/i, "J");
}

function NextMatchFeature({ match }: { match: Match }) {
  const isHome = match.homeTeam.id === "real-zaragoza";
  const rival = isHome ? match.awayTeam : match.homeTeam;

  return (
    <section className="next-fixture" aria-labelledby="next-fixture-title">
      <div className="next-fixture-heading">
        <span className="next-fixture-kicker">Próximo partido</span>
        <span>{match.round}</span>
      </div>
      <div className="next-fixture-main">
        <div className="next-fixture-team">
          <TeamMark team={rival} />
          <div>
            <span>{isHome ? "En casa" : "A domicilio"}</span>
            <h2 id="next-fixture-title">{rival.name}</h2>
            <small>Real Zaragoza · {isHome ? "Local" : "Visitante"}</small>
          </div>
        </div>
        <div className="next-fixture-schedule">
          <span>{scheduleLabel(match)}</span>
          <strong>{matchDateLabel(match)}</strong>
          <em>{kickoffLabel(match)}</em>
        </div>
        <div className="next-fixture-meta">
          {match.venue ? (
            <span>
              <small>Estadio</small>
              {match.venue}
            </span>
          ) : null}
          <span>
            <small>Estado</small>
            {match.status === "postponed" ? "Aplazado" : "Pendiente de disputar"}
          </span>
          <span>
            <small>Fuente</small>
            {match.source.name}
          </span>
        </div>
      </div>
    </section>
  );
}

export function MatchListRow({
  match,
  isNext = false,
}: {
  match: Match;
  isNext?: boolean;
}) {
  const isHome = match.homeTeam.id === "real-zaragoza";
  const rival = isHome ? match.awayTeam : match.homeTeam;
  const outcome = matchOutcome(match);
  const hasSpecificSource =
    match.venueSource && match.venueSource.id !== match.source.id;
  const isFinished = match.status === "finished" && Boolean(match.score);
  const isPostponed = match.status === "postponed";
  const isLive = match.status === "live";

  return (
    <article
      className={[
        "match-list-row",
        isNext ? "match-list-row-next" : "",
        isFinished ? "match-list-row-finished" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-match-id={match.id}
    >
      <div className="match-round">
        <span>{roundAbbreviation(match.round)}</span>
        {isNext ? <small>Próximo</small> : null}
      </div>
      <div className="match-list-date">
        <strong>{matchDateLabel(match, true)}</strong>
        <span>{isConfirmedKickoff(match) ? "Confirmada" : "Fecha base"}</span>
      </div>
      <div className="match-list-rival">
        <TeamMark team={rival} size="small" />
        <div>
          <strong>{rival.name}</strong>
          <span>{match.competition.shortName}</span>
        </div>
      </div>
      <span className="match-condition">
        {isHome ? "Local" : "Visitante"}
      </span>
      <div className="match-list-schedule">
        {isPostponed ? (
          <strong className="match-status match-status-alert">Aplazado</strong>
        ) : isLive ? (
          <strong className="match-status match-status-live">En juego</strong>
        ) : isFinished ? (
          <span>Finalizado</span>
        ) : isConfirmedKickoff(match) ? (
          <strong>{kickoffLabel(match)}</strong>
        ) : (
          <strong className="match-status match-status-pending">
            Horario pendiente
          </strong>
        )}
        {match.venue ? (
          <span className="match-venue">{match.venue}</span>
        ) : (
          <span className="match-venue">Estadio por confirmar</span>
        )}
      </div>
      <div className="match-list-result">
        {isFinished && outcome ? (
          <>
            <strong>{resultLabel(match)}</strong>
            <span className={`match-outcome match-outcome-${outcome}`}>
              {outcomeLabel(outcome)}
            </span>
          </>
        ) : null}
      </div>
      <details className="match-row-details">
        <summary aria-label={`Ver detalles de ${match.round}`}>
          Detalles
        </summary>
        <div>
          <span>
            <small>Estadio</small>
            {venueLabel(match)}
          </span>
          {hasSpecificSource ? (
            <span>
              <small>Fuente del estadio</small>
              {match.venueSource?.name}
            </span>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<[T, string]>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="sports-filter-group">
      <span>{label}</span>
      <div>
        {options.map(([option, optionLabel]) => (
          <button
            aria-pressed={value === option}
            className={value === option ? "active" : ""}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MatchesExplorer({
  matches,
  stale = false,
}: {
  matches: Match[];
  generatedAt: string;
  stale?: boolean;
}) {
  const [tab, setTab] = useState<"calendar" | "results">("calendar");
  const [competition, setCompetition] = useState<CompetitionFilter>("all");
  const [state, setState] = useState<MatchStateFilter>("all");
  const [condition, setCondition] = useState<MatchConditionFilter>("all");
  const [view, setView] = useState<MatchView>("month");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const nextTab = params.get("tab");
      const nextCompetition = params.get("competition");
      const nextState = params.get("status");
      const nextCondition = params.get("condition");
      const nextView = params.get("group");
      if (nextTab === "results") setTab("results");
      if (
        nextCompetition &&
        validCompetitions.has(nextCompetition as CompetitionFilter)
      ) {
        setCompetition(nextCompetition as CompetitionFilter);
      }
      if (nextState && validStates.has(nextState as MatchStateFilter)) {
        setState(nextState as MatchStateFilter);
      }
      if (
        nextCondition &&
        validConditions.has(nextCondition as MatchConditionFilter)
      ) {
        setCondition(nextCondition as MatchConditionFilter);
      }
      if (nextView && validViews.has(nextView as MatchView)) {
        setView(nextView as MatchView);
      }
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (tab === "results") params.set("tab", tab);
    if (competition !== "all") params.set("competition", competition);
    if (tab === "calendar" && state !== "all") params.set("status", state);
    if (condition !== "all") params.set("condition", condition);
    if (tab === "calendar" && view !== "month") params.set("group", view);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [competition, condition, state, tab, urlReady, view]);

  const filtered = useMemo(
    () =>
      filterMatchesByCriteria(matches, competition, state, condition),
    [competition, condition, matches, state],
  );
  const groups = useMemo(
    () => groupMatches(filtered, view),
    [filtered, view],
  );
  const resultMatches = useMemo(
    () =>
      filterMatchesByCriteria(matches, competition, "finished", condition),
    [competition, condition, matches],
  );
  const resultGroups = useMemo(
    () => finishedByCompetition(resultMatches),
    [resultMatches],
  );
  const nextMatch = matches.find((match) => match.status !== "finished");
  const activeFilters =
    Number(competition !== "all") +
    Number(condition !== "all") +
    (tab === "calendar"
      ? Number(state !== "all") + Number(view !== "month")
      : 0);
  const visibleCount =
    tab === "calendar" ? filtered.length : resultMatches.length;

  function clearFilters() {
    setCompetition("all");
    setState("all");
    setCondition("all");
    setView("month");
  }

  return (
    <>
      {nextMatch ? <NextMatchFeature match={nextMatch} /> : null}

      <div className="sports-tabs" role="tablist" aria-label="Partidos y resultados">
        <button
          aria-controls="calendario"
          aria-selected={tab === "calendar"}
          className={tab === "calendar" ? "active" : ""}
          onClick={() => setTab("calendar")}
          role="tab"
          type="button"
        >
          Calendario
        </button>
        <button
          aria-controls="resultados"
          aria-selected={tab === "results"}
          className={tab === "results" ? "active" : ""}
          onClick={() => setTab("results")}
          role="tab"
          type="button"
        >
          Resultados
        </button>
      </div>

      <div className="matches-toolbar">
        <div className="matches-toolbar-summary">
          <strong>{visibleCount} resultados</strong>
          {stale ? <span>Datos desactualizados</span> : null}
          <button
            aria-expanded={filtersOpen}
            className="mobile-filter-toggle"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            Filtros{activeFilters ? ` (${activeFilters})` : ""}
          </button>
        </div>
        <div
          className={`sports-filter-bar ${filtersOpen ? "is-open" : ""}`}
          aria-label="Filtros de partidos"
        >
          <FilterChips
            label="Competición"
            onChange={setCompetition}
            options={competitionFilters}
            value={competition}
          />
          {tab === "calendar" ? (
            <FilterChips
              label="Estado"
              onChange={setState}
              options={stateFilters}
              value={state}
            />
          ) : null}
          <FilterChips
            label="Condición"
            onChange={setCondition}
            options={conditionFilters}
            value={condition}
          />
          {tab === "calendar" ? (
            <FilterChips
              label="Agrupación"
              onChange={setView}
              options={viewFilters}
              value={view}
            />
          ) : null}
          {activeFilters > 0 ? (
            <button
              className="clear-filters"
              onClick={clearFilters}
              type="button"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      {tab === "calendar" ? (
        <section id="calendario" aria-live="polite" role="tabpanel">
          {groups.length > 0 ? (
            groups.map((group) => (
              <section className="schedule-group" key={group.label}>
                <h2>
                  <span>{group.label}</span>
                  <small>
                    {group.matches.length}{" "}
                    {group.matches.length === 1 ? "partido" : "partidos"}
                  </small>
                </h2>
                <div className="schedule-list">
                  {group.matches.map((match) => (
                    <MatchListRow
                      isNext={match.id === nextMatch?.id}
                      key={match.id}
                      match={match}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : competition !== "all" &&
            !matches.some((match) =>
              filterMatchesByCriteria([match], competition, "all", "all").length
            ) ? (
            <div className="sports-inline-state">
              <span aria-hidden="true">0</span>
              <div>
                <strong>Esta competición todavía no tiene datos</strong>
                <p>El calendario de liga permanece disponible.</p>
              </div>
              <button onClick={clearFilters} type="button">
                Ver todos
              </button>
            </div>
          ) : (
            <div className="sports-inline-state">
              <span aria-hidden="true">0</span>
              <div>
                <strong>No hay partidos con estos filtros</strong>
                <p>Prueba otra combinación de estado o condición.</p>
              </div>
              <button onClick={clearFilters} type="button">
                Limpiar
              </button>
            </div>
          )}
        </section>
      ) : (
        <section id="resultados" aria-live="polite" role="tabpanel">
          {resultGroups.length > 0 ? (
            resultGroups.map((group) => (
              <section className="schedule-group" key={group.label}>
                <h2>
                  <span>{group.label}</span>
                  <small>
                    {group.matches.length}{" "}
                    {group.matches.length === 1 ? "resultado" : "resultados"}
                  </small>
                </h2>
                <div className="schedule-list">
                  {group.matches.map((match) => (
                    <MatchListRow key={match.id} match={match} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="sports-inline-state">
              <span aria-hidden="true">—</span>
              <div>
                <strong>Aún no hay resultados oficiales</strong>
                <p>
                  La temporada no ha comenzado. Aparecerán aquí del más reciente
                  al más antiguo.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
