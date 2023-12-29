import { Router } from 'express';
import { Db } from 'mongodb';

import { RedisClientType } from './modules/redis.js';
import { catchAsync } from '../lib/catchAsync.js';

type Dependencies = {
  db: Db;
  redis: RedisClientType;
};

export const initHealthModule = ({ db, redis }: Dependencies) => {
  const router = Router();

  router.get(
    '/',
    catchAsync(async (_req, res) => {
      await db.command({ ping: 1 });
      await redis.ping();
      res.json({
        status: 'ok',
        date: new Date().toISOString(),
      });
    }),
  );

  return router;
};
