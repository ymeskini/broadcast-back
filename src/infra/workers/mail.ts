import { Queue, Worker } from 'bullmq';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

import { envVariables } from '../../lib/env.js';
import { sharedRedisConnection } from './redisConnection.js';

const mailerSend = new MailerSend({
  apiKey: envVariables.EMAIL_API_KEY,
});

const sentFrom = new Sender(envVariables.EMAIL_SUPPORT, 'Youssef Meskini');

type ReturnedData = Awaited<ReturnType<typeof mailerSend.email.send>>;

const mailTemplates = {
  signup: {
    id: '3z0vklo76yvg7qrx',
    subject: 'Welcome!',
  },
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

export type EmailQueue = typeof emailQueue;

const generateSubstitutions = (data: EmailData[TemplateIds]) => {
  return Object.keys(data).map((key) => {
    const typedKey = key as keyof EmailData[TemplateIds];
    return {
      var: key,
      value: data[typedKey],
    };
  });
};

new Worker<QueueData, ReturnedData, 'email'>(
  'email',
  (job) => {
    const { data } = job;
    const template = mailTemplates[data.templateKey];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setReplyTo(sentFrom)
      .setTo([new Recipient(data.to)])
      .setSubject(template.subject)
      .setTemplateId(template.id)
      .setVariables([
        {
          email: data.to,
          substitutions: generateSubstitutions(data.data),
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
