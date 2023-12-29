import { Router } from 'express';
import { z } from 'zod';

import { validateRequest } from '../../infra/middleware/validateRequest.js';
import { catchAsync } from '../../lib/catchAsync.js';
import { envVariables } from '../../lib/env.js';
import { sessionSchema } from '../auth/auth.module.js';
import { encrypt } from '../../lib/encryption.js';
import { RedisClientType } from '../../infra/modules/redis.js';
import { getTwitchAccessToken, getTwitchOAuthURL } from './twitch.requests.js';
import { JWTProvider } from '../../infra/jwt.provider.js';
import { AppError } from '../../lib/AppError.js';

type Dependencies = {
  redis: RedisClientType;
  jwtProvider: JWTProvider;
};

export const initPlatformsModule = ({ redis, jwtProvider }: Dependencies) => {
  const router = Router();
  const platformSchema = z.union([z.literal('twitch'), z.literal('youtube')]);
  const jwtPayloadSchema = z.object({
    platform: platformSchema,
    flow: z.literal('oauth'),
    sub: z.string(),
  });

  router.post(
    '/oauth_url',
    validateRequest(
      {
        body: z.object({
          platform: platformSchema,
        }),
      },
      catchAsync(async (req, res) => {
        const { userId } = sessionSchema.parse(req.session.auth);
        const { platform } = req.body;
        const token = await jwtProvider.generateToken(
          {
            platform,
            flow: 'oauth',
          },
          userId,
        );

        const url = getTwitchOAuthURL(false);
        url.pathname = `/oauth2/authorize`;
        url.searchParams.set('scope', 'chat:edit chat:read');
        url.searchParams.set('response_type', 'code');
        url.searchParams.set(
          'redirect_uri',
          `http://localhost:5173/redirect/${platform}`,
        );
        url.searchParams.set('force_verify', 'true');
        url.searchParams.set('state', token);

        res.json({
          url,
        });
      }),
    ),
  );

  router.post(
    '/oauth/:platform',
    validateRequest(
      {
        params: z.object({
          platform: platformSchema,
        }),
        body: z.object({
          code: z.string(),
          state: z.string(),
        }),
      },
      catchAsync(async (req, res) => {
        const { code, state } = req.body;
        const session = sessionSchema.parse(req.session.auth);
        const twitchTokenResponse = await getTwitchAccessToken(code);
        const jwtPayload = await jwtProvider.verifyToken(state);
        const { sub } = jwtPayloadSchema.parse(jwtPayload.payload);

        if (sub !== session.userId) {
          throw new AppError('Forbidden', 403);
        }

        await redis
          .multi()
          .set(
            `twitch:access_token:${session.userId}`,
            encrypt(
              twitchTokenResponse.access_token,
              envVariables.DB_ENCRYPTION_KEY,
            ),
            {
              EX: twitchTokenResponse.expires_in,
            },
          )
          .set(
            `twitch:refresh_token:${session.userId}`,
            encrypt(
              twitchTokenResponse.refresh_token,
              envVariables.DB_ENCRYPTION_KEY,
            ),
          )
          .exec();

        res.json({ success: true });
      }),
    ),
  );

  return router;
};
