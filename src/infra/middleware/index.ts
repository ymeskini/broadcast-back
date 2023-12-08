import express, { Express } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import session from 'express-session';
import RedisStore from 'connect-redis';

import { __DEV__, envVariables } from '../../lib/env.js';
import { RedisClientType } from '../modules/redis.js';

declare module 'express-session' {
  interface SessionData {
    // here you can add the properties you want to the session
  }
}


export const initMiddleware = (app: Express, redis: RedisClientType) => {
  const redisStore = new RedisStore({
    client: redis,
    prefix: 'session:',
  });

  app
    .set('trust proxy', 1)
    .use(Sentry.Handlers.requestHandler())
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use(compression())
    .use(cors())
    .use(helmet())
    .use(
      session({
        name: 'sid',
        store: redisStore,
        resave: false,
        saveUninitialized: false,
        unset: 'destroy',
        secret: [envVariables.SESSION_SECRET],
        cookie: {
          secure: !__DEV__,
          httpOnly: true,
          signed: true,
          sameSite: 'strict',
          domain: envVariables.SESSION_DOMAIN,
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 30,
        },
      }),
    );
};
