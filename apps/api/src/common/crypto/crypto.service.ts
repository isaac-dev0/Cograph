import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Provides AES-256-GCM symmetric encryption for sensitive fields (e.g. GitHub PATs).
 * The encryption key is derived from the `ENCRYPTION_KEY` environment variable.
 * Ciphertext is stored as a colon-delimited string: `iv:authTag:ciphertext` (all hex).
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY environment variable is not set.',
      );
    }
    // Derive a stable 32-byte key from whatever length string is provided.
    this.key = createHash('sha256').update(raw).digest();
  }

  /**
   * Encrypts a plaintext string using AES-256-GCM.
   *
   * @param plaintext The value to encrypt.
   * @returns A hex-encoded string in the format `iv:authTag:ciphertext`.
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  /**
   * Decrypts a value produced by `encrypt`.
   *
   * @param ciphertext The `iv:authTag:ciphertext` hex string.
   * @returns The original plaintext string.
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new InternalServerErrorException('Invalid ciphertext format.');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
