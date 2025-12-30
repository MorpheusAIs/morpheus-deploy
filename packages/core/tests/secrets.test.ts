import { describe, it, expect, beforeEach } from 'vitest';

import { SealedSecrets } from '../src/sdl/secrets';

describe('SealedSecrets', () => {
  let secrets: SealedSecrets;

  beforeEach(() => {
    secrets = new SealedSecrets();
  });

  describe('encrypt', () => {
    it('should encrypt a secret value', async () => {
      // Generate a proper keypair for encryption
      const keypair = secrets.generateKeyPair();
      const encrypted = await secrets.encrypt('API_KEY', 'secret-value', keypair.publicKey);

      expect(encrypted).toBeDefined();
      expect(encrypted.startsWith('enc:')).toBe(true);
    });

    it('should return empty string for empty value', async () => {
      const keypair = secrets.generateKeyPair();
      const encrypted = await secrets.encrypt('EMPTY', '', keypair.publicKey);

      expect(encrypted).toBe('');
    });

    it('should produce different ciphertext for same value', async () => {
      // Each encryption should produce different ciphertext due to ephemeral key
      const keypair = secrets.generateKeyPair();
      const encrypted1 = await secrets.encrypt('KEY', 'value', keypair.publicKey);
      const encrypted2 = await secrets.encrypt('KEY', 'value', keypair.publicKey);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      expect(secrets.isEncrypted('enc:base64data')).toBe(true);
    });

    it('should return false for plain values', () => {
      expect(secrets.isEncrypted('plain-value')).toBe(false);
      expect(secrets.isEncrypted('')).toBe(false);
    });
  });

  describe('generateKeyPair', () => {
    it('should generate valid keypair', () => {
      const keypair = secrets.generateKeyPair();

      expect(keypair.publicKey).toBeDefined();
      expect(keypair.privateKey).toBeDefined();
      expect(typeof keypair.publicKey).toBe('string');
      expect(typeof keypair.privateKey).toBe('string');
    });

    it('should generate unique keypairs', () => {
      const keypair1 = secrets.generateKeyPair();
      const keypair2 = secrets.generateKeyPair();

      expect(keypair1.privateKey).not.toBe(keypair2.privateKey);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should decrypt encrypted value with correct private key', async () => {
      const keypair = secrets.generateKeyPair();
      const original = 'my-secret-value';

      const encrypted = await secrets.encrypt('KEY', original, keypair.publicKey);
      const decrypted = await secrets.decrypt(encrypted, keypair.privateKey);

      expect(decrypted).toBe(original);
    });

    it('should return unencrypted value as-is', async () => {
      const plainValue = 'not-encrypted';

      const result = await secrets.decrypt(plainValue, 'any-key');

      expect(result).toBe(plainValue);
    });
  });

  describe('validateSecrets', () => {
    it('should pass when all required secrets are encrypted', async () => {
      const keypair = secrets.generateKeyPair();
      const env = {
        API_KEY: await secrets.encrypt('API_KEY', 'value', keypair.publicKey),
        DB_PASSWORD: await secrets.encrypt('DB_PASSWORD', 'value', keypair.publicKey),
      };

      const result = secrets.validateSecrets(['API_KEY', 'DB_PASSWORD'], env);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.unencrypted).toHaveLength(0);
    });

    it('should report missing secrets', () => {
      const env = {
        API_KEY: 'enc:encrypted',
      };

      const result = secrets.validateSecrets(['API_KEY', 'DB_PASSWORD'], env);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('DB_PASSWORD');
    });

    it('should report unencrypted secrets', () => {
      const env = {
        API_KEY: 'enc:encrypted',
        DB_PASSWORD: 'plain-text-value',
      };

      const result = secrets.validateSecrets(['API_KEY', 'DB_PASSWORD'], env);

      expect(result.valid).toBe(false);
      expect(result.unencrypted).toContain('DB_PASSWORD');
    });
  });
});
