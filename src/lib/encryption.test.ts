import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decrypt, encrypt } from './encryption.js';

describe('encryption', () => {
  const key = crypto.randomBytes(32).toString('base64');

  it('should encrypt and decrypt', () => {
    const text =
      'this is a secret that should not be shared and should be securely stored somewhere';
    const encrypted = encrypt(text, key);
    const decrypted = decrypt(encrypted, key);
    assert.equal(decrypted, text);
  });
});
