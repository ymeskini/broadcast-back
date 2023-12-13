import { Queue, Worker } from 'bullmq';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

import { __DEV__, envVariables } from '../../lib/env.js';
import { sharedRedisConnection } from './redisConnection.js';

const mailerSend = new MailerSend({
  apiKey: envVariables.MAIL_API_KEY,
});

const sentFrom = new Sender(envVariables.EMAIL_SUPPORT, 'Youssef Meskini');

type ReturnedData = Awaited<ReturnType<typeof mailerSend.email.send>>;

const templateId = {
  signup: '3z0vklo76yvg7qrx',
} as const;

type EmailData = {
  signup: {
    code: string;
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
  (job) => {
    const recipients = [new Recipient(job.data.to)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject('Welcome to the moderation chat!')
      .setTemplateId(templateId[job.data.templateKey])
      .setVariables([
        {
          email: job.data.to,
          substitutions: [
            {
              var: 'code',
              value: job.data.data.code,
            },
          ],
        },
      ]);
    return mailerSend.email.send(emailParams);
  },
  {
    removeOnComplete: {
      count: 10,
    },
    connection: sharedRedisConnection,
  },
);
