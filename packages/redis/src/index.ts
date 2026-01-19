import { RedisClient } from 'bun';
import { env } from '@repo/env/redis';

const redis = new RedisClient(env.REDIS_URL);

export const telemetryRedis = new RedisClient(env.TELEMETRY_REDIS_URL, {
  maxRetries: 0,
});

export default redis;
export { telemetryRedis as tlmRedis };
