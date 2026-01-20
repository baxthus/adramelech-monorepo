import { createEnv } from '@t3-oss/env-core';
import z from 'zod';

export const env = createEnv({
  server: {
    BOT_TOKEN: z.string(),
    BOT_ID: z.string(),
    PRESENCE_TYPE: z.coerce.number(),
    PRESENCE_NAME: z.string(),
    AUTHOR_URL: z.url().default('https://www.pudim.com.br'),
    REPOSITORY_URL: z.url(),
    DEFAULT_COOLDOWN_SECONDS: z.coerce.number().int().positive(),
    USER_AGENT: z.string().default('adramelech'),
    OPENWEATHER_KEY: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
