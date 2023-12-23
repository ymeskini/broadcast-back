import crypto from 'node:crypto';

export const createHmacSignature = (body: Buffer, secret: string) => {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
};

export const compareSignatures = (
  signature: string,
  computedSignature: string,
) => {
  const source = Buffer.from(signature);
  const comparison = Buffer.from(computedSignature);
  return crypto.timingSafeEqual(source, comparison);
};
