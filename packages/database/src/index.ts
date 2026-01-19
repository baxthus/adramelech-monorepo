import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { env } from '@repo/env/database';

export const db = drizzle(env.DATABASE_URL, { schema });
