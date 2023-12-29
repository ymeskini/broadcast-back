import { Queue, Worker } from 'bullmq';

import { envVariables } from '../../lib/env.js';
import { sharedRedisConnection } from './redisConnection.js';

const getMailApiUrl = () => new URL('https://api.mailersend.com');

type EmailData = {
  signup: {
    code: string;
  };
};

const generateSubstitutions = (data: EmailData[TemplateIds]) => {
  return Object.keys(data).map((key) => {
    const typedKey = key as keyof EmailData[TemplateIds];
    return {
      var: key,
      value: data[typedKey],
    };
  });
};

const mailTemplates = {
  signup: {
    id: '3z0vklo76yvg7qrx',
    subject: 'Welcome!',
  },
} as const;

const sendMail = async <T extends TemplateIds>(
  to: string,
  template: T,
  data: EmailData[T],
) => {
  const url = getMailApiUrl();
  url.pathname = '/v1/email';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${envVariables.EMAIL_API_KEY}`,
    },
    body: JSON.stringify({
      from: {
        name: 'Youssef Meskini',
        email: envVariables.EMAIL_SUPPORT,
      },
      to: [
        {
          email: to,
        },
      ],
      subject: mailTemplates[template].subject,
      template_id: mailTemplates[template].id,
      variables: [
        {
          email: to,
          substitutions: generateSubstitutions(data),
        },
      ],
    }),
  });

  return {
    messageId: response.headers.get('X-Message-Id'),
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

export const emailQueue = new Queue<QueueData, { messageId: string }, 'email'>(
  'email',
  {
    connection: sharedRedisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
    },
  },
);

export type EmailQueue = typeof emailQueue;

new Worker<QueueData, { messageId: string | null }, 'email'>(
  'email',
  (job) => {
    const { data } = job;

    return sendMail(data.to, data.templateKey, data.data);
  },
  {
    removeOnComplete: {
      count: 10,
    },
    connection: sharedRedisConnection,
  },
);
