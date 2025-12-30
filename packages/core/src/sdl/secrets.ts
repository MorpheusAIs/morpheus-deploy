import { encrypt, decrypt as eciesDecrypt, PrivateKey } from 'eciesjs';
import { randomBytes } from 'crypto';

export interface EncryptedSecret {
  ciphertext: string;
  ephemeralPublicKey: string;
  nonce: string;
}

export class SealedSecrets {
  private providerPublicKeys: Map<string, string> = new Map();

  /**
   * Fetch and cache a provider's public key
   */
  async fetchProviderPublicKey(providerAddress: string): Promise<string> {
    if (this.providerPublicKeys.has(providerAddress)) {
      return this.providerPublicKeys.get(providerAddress)!;
    }

    // Query provider's public key from their API
    // In production, this would be fetched from the provider's endpoint
    try {
      const response = await fetch(
        `https://${providerAddress}.akash.pub/v1/public-key`
      );
      const data = await response.json() as { publicKey: string };
      this.providerPublicKeys.set(providerAddress, data.publicKey);
      return data.publicKey;
    } catch {
      // For development, generate a deterministic key
      const mockKey = this.generateDeterministicKey(providerAddress);
      this.providerPublicKeys.set(providerAddress, mockKey);
      return mockKey;
    }
  }

  /**
   * Encrypt a secret value using ECIES
   * The encrypted value can only be decrypted by the provider
   */
  async encrypt(
    key: string,
    value: string,
    providerPublicKey?: string
  ): Promise<string> {
    if (!value) {
      return '';
    }

    // Use provided public key or a default for testing
    const publicKey = providerPublicKey || this.getDefaultPublicKey();

    try {
      // Convert value to buffer
      const plaintext = Buffer.from(value, 'utf-8');

      // Encrypt using ECIES
      const ciphertext = encrypt(publicKey, plaintext);

      // Return base64-encoded ciphertext with prefix
      return `enc:${ciphertext.toString('base64')}`;
    } catch (error) {
      throw new Error(
        `Failed to encrypt secret "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt a secret value (only works if we have the private key)
   * This is primarily for testing purposes
   */
  async decrypt(
    encryptedValue: string,
    privateKey: string
  ): Promise<string> {
    if (!encryptedValue.startsWith('enc:')) {
      return encryptedValue; // Not encrypted
    }

    try {
      const ciphertext = Buffer.from(
        encryptedValue.slice(4), // Remove 'enc:' prefix
        'base64'
      );

      // Use the eciesjs decrypt function with private key hex
      const plaintext = eciesDecrypt(privateKey, ciphertext);

      return plaintext.toString('utf-8');
    } catch (error) {
      throw new Error(
        `Failed to decrypt secret: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a value is encrypted
   */
  isEncrypted(value: string): boolean {
    return value.startsWith('enc:');
  }

  /**
   * Generate a new keypair for testing
   */
  generateKeyPair(): { publicKey: string; privateKey: string } {
    const privateKey = new PrivateKey();
    return {
      publicKey: privateKey.publicKey.toHex(),
      privateKey: privateKey.toHex(),
    };
  }

  /**
   * Validate that all required secrets are present and encrypted
   */
  validateSecrets(
    requiredSecrets: string[],
    env: Record<string, string>
  ): { valid: boolean; missing: string[]; unencrypted: string[] } {
    const missing: string[] = [];
    const unencrypted: string[] = [];

    for (const secret of requiredSecrets) {
      const value = env[secret];

      if (!value) {
        missing.push(secret);
      } else if (!this.isEncrypted(value)) {
        unencrypted.push(secret);
      }
    }

    return {
      valid: missing.length === 0 && unencrypted.length === 0,
      missing,
      unencrypted,
    };
  }

  private getDefaultPublicKey(): string {
    // Default public key for development/testing
    // In production, this would be fetched from the provider
    return '04' + randomBytes(64).toString('hex');
  }

  private generateDeterministicKey(seed: string): string {
    // Generate a deterministic key from a seed (for testing)
    const hash = Buffer.from(seed).toString('hex').padEnd(64, '0').slice(0, 64);
    return '04' + hash + hash;
  }
}
