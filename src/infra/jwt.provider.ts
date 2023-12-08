import { KeyLike, SignJWT, importPKCS8, jwtVerify } from 'jose';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'node:fs';

import { s3Client } from './modules/s3.js';
import { AppError } from '../lib/AppError.js';
import { __DEV__, envVariables } from '../lib/env.js';

const ALGORITHM = 'RS256' as const;
const FILE_NAME = 'private.pem' as const;

export class JWTProvider {
  private privateKey!: KeyLike;

  async load() {
    if (__DEV__) {
      const privatekey = readFileSync(FILE_NAME).toString();
      this.privateKey = await importPKCS8(privatekey, ALGORITHM);
      return;
    }
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: envVariables.AWS_S3_BUCKET_NAME,
        Key: FILE_NAME,
      }),
    );

    if (!result.Body) {
      throw new AppError('Could not load private key from S3', 500);
    }

    const fileContent = await result.Body.transformToString();
    const privateKey = await importPKCS8(fileContent, ALGORITHM);

    this.privateKey = privateKey;
  }

  async generateToken() {
    const token = await new SignJWT()
      .setProtectedHeader({
        alg: ALGORITHM,
      })
      .sign(this.privateKey);

    return token;
  }

  async verifyToken(token: string) {
    const decoded = await jwtVerify(token, this.privateKey, {
      algorithms: [ALGORITHM],
    });

    return decoded;
  }
}
