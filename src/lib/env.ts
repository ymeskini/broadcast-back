import { z } from 'zod';

const envSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_REGION: z.string().default('eu-central-1'),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),
  EMAIL_SUPPORT: z.string(),
  ENVIRONMENT: z.string().optional(),
  JWT_SECRET: z.string(),
  MONGO_DB_URL: z.string(),
  PORT: z.string().default('4444'),
  POSTMARK_API_KEY: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.string().default('6379'),
  SENTRY_DSN: z.string().optional(),
  SESSION_DOMAIN: z.string(),
  SESSION_SECRET: z.string(),
});

export const envVariables = envSchema.parse(process.env);
export const __DEV__ = envVariables.ENVIRONMENT === 'development';
