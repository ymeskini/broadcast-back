import express, { Router } from 'express';
import { z } from 'zod';

import { compareSignatures, createHmacSignature } from './webhooks.helpers.js';
import { envVariables } from '../../lib/env.js';
import { catchAsync } from '../../lib/catchAsync.js';
import { validateRequest } from '../../infra/middleware/validateRequest.js';
import { logger } from '../../lib/logger.js';

export const initWebhooksModule = () => {
  const router = Router();
  const headerSignatureSchema = z.string();
  const webhookLogger = logger.child({ module: 'webhooks' });

  router.use(express.raw({ type: 'application/json' }));

  router.post(
    '/mail',
    validateRequest(
      {},
      catchAsync(async (req, res) => {
        const body = req.body as Buffer;
        const signature = headerSignatureSchema.parse(req.get('signature'));
        const computedSignature = createHmacSignature(
          body,
          envVariables.EMAIL_SIGNATURE_SECRET,
        );

        if (compareSignatures(signature, computedSignature)) {
          webhookLogger.info(body.toString(), '[MAILING]');
          res.sendStatus(200);
        } else {
          res.sendStatus(403);
        }
      }),
    ),
  );

  return router;
};
