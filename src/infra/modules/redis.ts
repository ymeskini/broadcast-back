import { createClient } from 'redis';
import { envVariables } from '../../lib/env.js';

export const redis = createClient({
  password: envVariables.REDIS_PASSWORD,
  socket: {
    port: Number(envVariables.REDIS_PORT),
    host: envVariables.REDIS_HOST,
  },
});

export type RedisClientType = typeof redis;
