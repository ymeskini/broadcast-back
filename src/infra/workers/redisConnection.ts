import { ConnectionOptions } from 'bullmq';
import { envVariables } from '../../lib/env.js';

export const sharedRedisConnection: ConnectionOptions = {
  host: envVariables.REDIS_HOST,
  port: Number(envVariables.REDIS_PORT),
  password: envVariables.REDIS_PASSWORD,
};
