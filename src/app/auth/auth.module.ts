import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { totp } from 'otplib';
import { ObjectId } from 'mongodb';

import { catchAsync } from '../../lib/catchAsync.js';
import { validateRequest } from '../../infra/middleware/validateRequest.js';
import { emailQueue } from '../../infra/workers/mail.js';
import { AppError } from '../../lib/AppError.js';

export const initAuthModule = () => {
  const router = Router();

  totp.options = {
    step: 5 * 60,
    window: 1,
  };

  router.post(
    '/signup',
    validateRequest(
      {
        body: z.object({
          email: z.string().email(),
        }),
      },
      catchAsync(async (req, res) => {
        const { email } = req.body;
        const userId = new ObjectId().toString();

        req.session.secretOtp = crypto.randomBytes(32).toString('hex');
        req.session.email = email;
        req.session.userId = userId;

        const otp = totp.generate(req.session.secretOtp);

        await emailQueue.add('email', {
          to: email,
          templateKey: 'signup',
          data: {
            code: otp,
          },
        });

        res.json({ id: userId });
      }),
    ),
  );

  router.post(
    '/otp',
    validateRequest(
      {
        body: z.object({
          code: z.string(),
        }),
      },
      catchAsync(async (req, res) => {
        const { code } = req.body;

        if (!req.session.secretOtp) {
          throw new AppError('Forbidden', 403);
        }

        const isCodeValid = totp.verify({
          secret: req.session.secretOtp,
          token: code,
        });

        if (!isCodeValid) {
          throw new AppError('Bad Request', 400);
        }

        res.json({ id: req.session.userId });
      }),
    ),
  );

  return router;
};
