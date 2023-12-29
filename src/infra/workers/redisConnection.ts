import { ConnectionOptions } from 'bullmq';
import { __DEV__, envVariables } from '../../lib/env.js';

export const sharedRedisConnection: ConnectionOptions = {
  host: envVariables.REDIS_HOST,
  port: Number(envVariables.REDIS_PORT),
  password: envVariables.REDIS_PASSWORD,
  family: __DEV__ ? undefined : 6,
};
