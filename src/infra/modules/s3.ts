import { S3Client } from '@aws-sdk/client-s3';
import { envVariables } from '../../lib/env.js';

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: envVariables.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVariables.AWS_SECRET_ACCESS_KEY,
  },
  region: envVariables.AWS_REGION,
});
