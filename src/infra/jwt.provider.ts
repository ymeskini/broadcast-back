import { SignJWT, jwtVerify } from 'jose';

import { envVariables } from '../lib/env.js';

const ALGORITHM = 'HS256';

export class JWTProvider {
  private secret!: Uint8Array;

  async init() {
    this.secret = new TextEncoder().encode(envVariables.JWT_SECRET);
  }

  generateToken(payload: any, userId: string) {
    const token = new SignJWT(payload)
      .setProtectedHeader({
        alg: ALGORITHM,
        b64: true,
      })
      .setSubject(userId)
      .setExpirationTime('1h');

    return token.sign(this.secret);
  }

  verifyToken(token: string) {
    return jwtVerify(token, this.secret, {
      algorithms: [ALGORITHM],
    });
  }
}
