import express, { Express } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import session from 'express-session';
import RedisStore from 'connect-redis';

import { __DEV__, envVariables } from '../../lib/env.js';
import { RedisClientType } from '../modules/redis.js';
import { AppError } from '../../lib/AppError.js';

declare module 'express-session' {
  interface SessionData {
    secretOtp?: string;
    email?: string;
    userId?: string;
  }
}

const ORIGINS = ["http://localhost:5173"];

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
    .use(
      cors({
        origin: function (origin, callback) {
          if (origin && ORIGINS.indexOf(origin) !== -1 || __DEV__) {
            callback(null, true);
          } else {
            callback(new AppError('Forbidden', 403));
          }
        },
        methods: ['POST', 'GET'],
        optionsSuccessStatus: 200,
        credentials: true,
      }),
    )
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
