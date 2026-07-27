import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurada en el servidor.");
  }

  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

