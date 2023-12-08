import { Queue, Worker } from 'bullmq';
import { ServerClient } from 'postmark';

import { envVariables } from '../../lib/env.js';
import { sharedRedisConnection } from './redisConnection.js';

const client = new ServerClient(envVariables.POSTMARK_API_KEY);
type ReturnedData = Awaited<ReturnType<typeof client.sendEmailWithTemplate>>;

type EmailData = {
  welcome: {
    product_url: string;
  };
  password_reset: {
    token: string;
  };
};

type TemplateIds = keyof EmailData;

type QueueData = {
  to: string;
} & {
  [K in TemplateIds]: {
    templateKey: K;
    data: EmailData[K];
  };
}[TemplateIds];

export const emailQueue = new Queue<QueueData, ReturnedData, 'email'>('email', {
  connection: sharedRedisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
  },
});

new Worker<QueueData, ReturnedData, 'email'>(
  'email',
  (job) =>
    client.sendEmailWithTemplate({
      From: envVariables.EMAIL_SUPPORT,
      To: job.data.to,
      TemplateAlias: job.data.templateKey,
      TemplateModel: job.data.data,
    }),
  {
    removeOnComplete: {
      count: 10,
    },
    connection: sharedRedisConnection,
  },
);
