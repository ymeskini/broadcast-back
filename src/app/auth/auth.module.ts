import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { totp } from 'otplib';
import { Db, ObjectId } from 'mongodb';

import { catchAsync } from '../../lib/catchAsync.js';
import { validateRequest } from '../../infra/middleware/validateRequest.js';
import { AppError } from '../../lib/AppError.js';
import { EmailQueue } from '../../infra/workers/mail.js';

type AuthModuleDependencies = {
  emailQueue: EmailQueue;
  db: Db;
};

const emailString = z.string().email();

const sessionSchema = z.object({
  email: emailString,
  secretOtp: z.string(),
  userId: z.string(),
  flow: z.union([z.literal('signup'), z.literal('login')]),
});

export type AuthSessionData = z.infer<typeof sessionSchema>;

const authRequestSchema = {
  body: z.object({
    email: emailString,
  }),
  params: z.object({
    flow: z.union([z.literal('signup'), z.literal('login')]),
  }),
};

const userSchema = z.object({
  email: emailString,
});

const OTP_LENGTH = 6;

export const initAuthModule = async ({
  emailQueue,
  db,
}: AuthModuleDependencies) => {
  const router = Router();
  const userCollection = db.collection<z.infer<typeof userSchema>>('users');
  await userCollection.createIndex({ email: 1 });

  totp.options = {
    step: 5 * 60,
    window: 1,
    digits: OTP_LENGTH,
  };

  const generateOtpAndSendEmail = async (email: string, secret: string) => {
    const totpToken = totp.generate(secret);
    await emailQueue.add('email', {
      to: email,
      templateKey: 'signup',
      data: {
        code: totpToken,
      },
    });
  };

  router.post(
    '/verify',
    validateRequest(
      {},
      catchAsync(async (req, res) => {
        const auth = sessionSchema.parse(req.session.auth);
        const user = await userCollection.findOne({
          _id: new ObjectId(auth.userId),
        });

        if (!user) {
          throw new AppError('User not found', 404);
        }

        res.json({
          status: 200,
          message: 'User verified',
        });
      }),
    ),
  );

  router.post(
    '/otp',
    validateRequest(
      {
        body: z.object({
          code: z.string().length(OTP_LENGTH),
        }),
      },
      catchAsync(async (req, res) => {
        const { code } = req.body;
        const { email, userId, secretOtp, flow } = sessionSchema.parse(
          req.session.auth,
        );

        if (
          !totp.verify({
            secret: secretOtp,
            token: code,
          })
        ) {
          res.status(401).json({
            status: 401,
            message: 'Invalid OTP',
          });
          return;
        }

        if (flow === 'signup') {
          await userCollection.insertOne({
            email,
            _id: new ObjectId(userId),
          });
        }

        res.json({
          status: 200,
          message: 'OTP verified',
        });
      }),
    ),
  );

  router.post('/logout', (req, res) => {
    const { session } = req;
    session.destroy((err) => {
      if (err) {
        throw new AppError('Internal Error', 500);
      }
      res.sendStatus(204);
    });
  });

  router.post(
    '/:flow',
    validateRequest(
      authRequestSchema,
      catchAsync(async (req, res) => {
        const { email } = req.body;
        const { flow } = req.params;
        const user = await userCollection.findOne({ email });

        if (user && flow === 'signup') {
          throw new AppError('User already exists', 409);
        }

        if (!user && flow === 'login') {
          throw new AppError('User not found', 404);
        }

        const userId = user?._id.toString() ?? new ObjectId().toString();
        const rollingSecret = crypto.randomBytes(32).toString('hex');

        req.session.auth = {
          email,
          userId,
          flow,
          secretOtp: rollingSecret,
        };

        await generateOtpAndSendEmail(email, rollingSecret);

        res.json({
          status: 200,
        });
      }),
    ),
  );

  return router;
};
