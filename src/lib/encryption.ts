import crypto from 'node:crypto';

const ENCRYPTION_METHOD = 'aes-256-gcm';

export const encrypt = (text: string, key: string) => {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(64);
  const iterations = crypto.randomInt(10000, 100000);

  const cryptoKey = crypto.pbkdf2Sync(key, salt, iterations, 32, 'sha512');
  const cipher = crypto.createCipheriv(ENCRYPTION_METHOD, cryptoKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([
    salt,
    iv,
    tag,
    encrypted,
    Buffer.from(iterations.toString()),
  ]).toString('base64');
};

export const decrypt = (encryptedText: string, key: string) => {
  const data = Buffer.from(encryptedText, 'base64');

  const salt = data.subarray(0, 64);
  const iv = data.subarray(64, 80);
  const tag = data.subarray(80, 96);
  const text = data.subarray(96, data.length - 5);
  const iterations = parseInt(data.subarray(data.length - 5).toString());

  const cryptoKey = crypto.pbkdf2Sync(key, salt, iterations, 32, 'sha512');
  const decipher = crypto.createDecipheriv(ENCRYPTION_METHOD, cryptoKey, iv);

  decipher.setAuthTag(tag);

  return decipher.update(text).toString('utf8') + decipher.final('utf8');
};
