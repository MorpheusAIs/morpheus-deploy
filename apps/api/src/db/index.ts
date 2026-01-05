import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getConfig } from '../lib/config.js';
import * as schema from './schema.js';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const config = getConfig();
    const client = postgres(config.databaseUrl);
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export { schema };
