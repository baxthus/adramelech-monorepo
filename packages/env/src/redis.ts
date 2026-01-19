import { createEnv } from '@t3-oss/env-core';
import z from 'zod';

export const env = createEnv({
  server: {
    REDIS_URL: z.url().startsWith('redis://'),
    TELEMETRY_REDIS_URL: z.url().startsWith('redis://').optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
