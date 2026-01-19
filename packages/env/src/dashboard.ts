import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_REPOSITORY_URL: z.url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_REPOSITORY_URL: process.env.NEXT_PUBLIC_REPOSITORY_URL,
  },
  emptyStringAsUndefined: true,
});
