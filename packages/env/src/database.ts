import { createEnv } from '@t3-oss/env-core';
import z from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.union([
      z.url().startsWith('postgresql://'),
      z.url().startsWith('postgres://'),
    ]),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
