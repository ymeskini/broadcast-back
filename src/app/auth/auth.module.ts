import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { totp } from 'otplib';
import { ObjectId } from 'mongodb';

import { catchAsync } from '../../lib/catchAsync.js';
import { validateRequest } from '../../infra/middleware/validateRequest.js';
import { AppError } from '../../lib/AppError.js';
import { EmailQueue } from '../../infra/workers/mail.js';
import { emailString } from '../../lib/commonSchemas.js';
import { Session, SessionData } from 'express-session';
import { UserModel } from '../user/user.model.js';

type AuthModuleDependencies = {
  emailQueue: EmailQueue;
  userModel: UserModel;
};

export const sessionSchema = z.object({
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

const OTP_LENGTH = 6;

export const initAuthModule = async ({
  emailQueue,
  userModel,
}: AuthModuleDependencies) => {
  const router = Router();

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

  const parseAuthSession = (session: Session & Partial<SessionData>) => {
    const sessionParsed = sessionSchema.safeParse(session.auth);

    if (!sessionParsed.success) {
      throw new AppError('Invalid session', 401);
    }

    return sessionParsed.data;
  };

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
        const { email, userId, flow, secretOtp } = parseAuthSession(
          req.session,
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
          await userModel.create({
            email,
            _id: new ObjectId(userId),
          });
        }

        res.json({
          success: true,
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
      res.json({
        success: true,
      });
    });
  });

  router.post(
    '/:flow',
    validateRequest(
      authRequestSchema,
      catchAsync(async (req, res) => {
        const { email } = req.body;
        const { flow } = req.params;
        const user = await userModel.find({ email });

        if (user && flow === 'signup') {
          throw new AppError('User already exists', 409);
        }

        if (!user && flow === 'login') {
          throw new AppError('User not found', 404);
        }

        const userId =
          flow === 'signup' ? new ObjectId().toString() : user._id.toString();
        const rollingSecret = crypto.randomBytes(32).toString('hex');

        req.session.auth = {
          email,
          userId,
          flow,
          secretOtp: rollingSecret,
        };

        await generateOtpAndSendEmail(email, rollingSecret);

        res.json({
          success: true,
        });
      }),
    ),
  );

  return router;
};
