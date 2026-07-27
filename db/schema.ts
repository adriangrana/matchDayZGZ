import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const matchStatus = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
  "postponed",
]);

export const confirmationLevel = pgEnum("confirmation_level", [
  "official",
  "confirmed",
  "negotiation",
  "rumor",
  "dismissed",
  "unknown",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  kind: text("kind").notNull(),
  isOfficial: boolean("is_official").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  ...timestamps,
});

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  providerId: text("provider_id"),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  crestUrl: text("crest_url"),
  ...timestamps,
});

export const competitions = pgTable("competitions", {
  id: text("id").primaryKey(),
  providerId: text("provider_id"),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  season: text("season").notNull(),
  ...timestamps,
});

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: text("provider_id").notNull(),
    sourceId: text("source_id")
      .references(() => sources.id)
      .notNull(),
    competitionId: text("competition_id")
      .references(() => competitions.id)
      .notNull(),
    homeTeamId: text("home_team_id")
      .references(() => teams.id)
      .notNull(),
    awayTeamId: text("away_team_id")
      .references(() => teams.id)
      .notNull(),
    round: text("round").notNull(),
    venue: text("venue"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    scheduleConfirmed: boolean("schedule_confirmed").default(false).notNull(),
    status: matchStatus("status").default("scheduled").notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("matches_source_provider_idx").on(
      table.sourceId,
      table.providerId,
    ),
    index("matches_starts_at_idx").on(table.startsAt),
  ],
);

export const standings = pgTable(
  "standings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    competitionId: text("competition_id")
      .references(() => competitions.id)
      .notNull(),
    teamId: text("team_id")
      .references(() => teams.id)
      .notNull(),
    matchday: integer("matchday").notNull(),
    position: integer("position").notNull(),
    played: integer("played").default(0).notNull(),
    won: integer("won").default(0).notNull(),
    drawn: integer("drawn").default(0).notNull(),
    lost: integer("lost").default(0).notNull(),
    goalDifference: integer("goal_difference").default(0).notNull(),
    points: integer("points").default(0).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("standings_competition_team_matchday_idx").on(
      table.competitionId,
      table.teamId,
      table.matchday,
    ),
  ],
);

export const newsArticles = pgTable(
  "news_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: text("source_id")
      .references(() => sources.id)
      .notNull(),
    originalUrl: text("original_url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    summary: text("summary").notNull(),
    author: text("author"),
    category: text("category").notNull(),
    confirmation: confirmationLevel("confirmation").default("unknown").notNull(),
    imageUrl: text("image_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    publishedUpdatedAt: timestamp("published_updated_at", {
      withTimezone: true,
    }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    relatedEntityIds: jsonb("related_entity_ids").$type<string[]>().default([]),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("news_canonical_url_idx").on(table.canonicalUrl),
    index("news_published_at_idx").on(table.publishedAt),
  ],
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: text("source_id").references(() => sources.id),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  recordsRead: integer("records_read").default(0).notNull(),
  recordsWritten: integer("records_written").default(0).notNull(),
  errorMessage: text("error_message"),
});
