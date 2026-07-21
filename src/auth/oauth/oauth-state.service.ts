import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

export interface OAuthSessionState {
  state: string;
  codeVerifier: string;
  nonce?: string;
  provider: 'google' | 'github';
}

@Injectable()
export class OAuthStateService {
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
