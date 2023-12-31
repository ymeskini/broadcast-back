import http from 'node:http';
import express from 'express';
import * as Sentry from '@sentry/node';
import { WebSocketServer } from 'ws';
import { MongoClient } from 'mongodb';

import { __DEV__, envVariables } from './lib/env.js';
import { initMiddleware } from './infra/middleware/index.js';
import { logger } from './lib/logger.js';
import { globalErrorHandler } from './infra/middleware/errorHandler.js';
import { AppError } from './lib/AppError.js';
import { RealtimeRepository } from './infra/realtime.gateway.js';
import { redis } from './infra/modules/redis.js';
import { initHealthModule } from './infra/health.routes.js';
import { JWTProvider } from './infra/jwt.provider.js';
import { initAuthModule } from './app/auth/auth.module.js';
import { emailQueue } from './infra/workers/mail.js';
import { initWebhooksModule } from './app/webhooks/webhooks.module.js';
import { initPlatformsModule } from './app/platforms/platforms.module.js';
import { initUserModule } from './app/user/user.module.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const mongoClient = new MongoClient(envVariables.MONGO_DB_URL);
const db = mongoClient.db('broadcast');
const jwtProvider = new JWTProvider();
const realtimeRepository = new RealtimeRepository(wss, redis, jwtProvider);

Sentry.init({
  enabled: !__DEV__,
  dsn: envVariables.SENTRY_DSN,
  profilesSampleRate: 1.0,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Mongo(),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});

const start = async () => {
  await mongoClient.connect();
  await redis.connect();
  await jwtProvider.init();
  await realtimeRepository.init();

  // keep this before all routes
  initMiddleware(app, redis);

  // ==== MODULES ====
  const userModule = await initUserModule(db);
  const authModule = await initAuthModule({
    emailQueue,
    userModel: userModule.userModel,
  });
  const webhooksModule = initWebhooksModule();
  const healthModule = initHealthModule({
    db,
    redis,
  });
  const platformsModule = initPlatformsModule({
    redis,
    jwtProvider,
  });
  // ================

  // ==== ROUTES ====
  app.use('/auth', authModule);
  app.use('/health', healthModule);
  app.use('/webhooks', webhooksModule);
  app.use('/platforms', platformsModule);
  // ================

  app
    .all('*', (_req, _res, next) => {
      next(new AppError('Not Found', 404));
    })
    .use(Sentry.Handlers.errorHandler())
    .use(globalErrorHandler());

  server.listen(envVariables.PORT, () => {
    logger.info(`Server is running at http://localhost:${envVariables.PORT}`);
  });
};

start();
