import { createClient } from 'redis';
import { __DEV__, envVariables } from '../../lib/env.js';

export const redis = createClient({
  password: envVariables.REDIS_PASSWORD,
  socket: {
    port: Number(envVariables.REDIS_PORT),
    host: envVariables.REDIS_HOST,
    family: __DEV__ ? undefined : 6,
  },
});

export type RedisClientType = typeof redis;
