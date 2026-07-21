import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class TokenEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('TOKEN_ENCRYPTION_KEY') || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    
    if (Buffer.from(rawKey, 'hex').length === 32) {
      this.key = Buffer.from(rawKey, 'hex');
    } else if (Buffer.from(rawKey, 'utf8').length === 32) {
      this.key = Buffer.from(rawKey, 'utf8');
    } else {
      // Fallback/derive 32-byte key using sha256
      this.key = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      const ivHex = iv.toString('hex');

      return `${ivHex}:${authTag}:${encrypted}`;
    } catch (error) {
      throw new InternalServerErrorException('Token encryption failed');
    }
  }

  decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) return null;
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException('Token decryption failed');
    }
  }
}
