import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export interface EphemeralKeyConfig {
  storageDir?: string;
  expirationHours?: number;
}

export interface EphemeralKeyData {
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  createdAt: string;
  expiresAt: string;
  permissions: string[];
  grantTxHash?: string;
}

export class EphemeralKeyManager {
  private storageDir: string;
  private expirationMs: number;
  private keyData: EphemeralKeyData | null = null;
  private account: PrivateKeyAccount | null = null;

  constructor(config: EphemeralKeyConfig = {}) {
    this.storageDir = config.storageDir || join(homedir(), '.morpheus');
    this.expirationMs = (config.expirationHours || 24) * 60 * 60 * 1000;
  }

  /**
   * Generate a new ephemeral key
   */
  async generate(permissions: string[]): Promise<EphemeralKeyData> {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // Encrypt the private key for storage
    const password = await this.getEncryptionPassword();
    const { encrypted, salt, iv } = this.encryptKey(privateKey, password);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.expirationMs);

    this.keyData = {
      address: account.address,
      publicKey: account.publicKey,
      encryptedPrivateKey: encrypted,
      salt,
      iv,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      permissions,
    };

    this.account = account;

    // Save to storage
    await this.save();

    return this.keyData;
  }

  /**
   * Load existing ephemeral key
   */
  async load(): Promise<EphemeralKeyData | null> {
    const keyPath = join(this.storageDir, 'ephemeral-key.json');

    if (!existsSync(keyPath)) {
      return null;
    }

    try {
      const content = await readFile(keyPath, 'utf-8');
      this.keyData = JSON.parse(content) as EphemeralKeyData;

      // Check if expired
      if (this.isExpired()) {
        await this.revoke();
        return null;
      }

      // Decrypt and load account
      const password = await this.getEncryptionPassword();
      const privateKey = this.decryptKey(
        this.keyData.encryptedPrivateKey,
        this.keyData.salt,
        this.keyData.iv,
        password
      );

      this.account = privateKeyToAccount(privateKey as `0x${string}`);

      return this.keyData;
    } catch {
      return null;
    }
  }

  /**
   * Get the account for signing
   */
  getAccount(): PrivateKeyAccount {
    if (!this.account) {
      throw new Error('Ephemeral key not loaded. Call load() or generate() first.');
    }
    return this.account;
  }

  /**
   * Check if key is expired
   */
  isExpired(): boolean {
    if (!this.keyData) return true;
    return new Date(this.keyData.expiresAt) < new Date();
  }

  /**
   * Check if key has specific permission
   */
  hasPermission(permission: string): boolean {
    if (!this.keyData) return false;
    return this.keyData.permissions.includes(permission) ||
           this.keyData.permissions.includes('*');
  }

  /**
   * Record the AuthZ grant transaction
   */
  async recordGrant(txHash: string): Promise<void> {
    if (!this.keyData) {
      throw new Error('No ephemeral key loaded');
    }

    this.keyData.grantTxHash = txHash;
    await this.save();
  }

  /**
   * Revoke the ephemeral key
   */
  async revoke(): Promise<void> {
    const keyPath = join(this.storageDir, 'ephemeral-key.json');

    if (existsSync(keyPath)) {
      const { unlink } = await import('fs/promises');
      await unlink(keyPath);
    }

    this.keyData = null;
    this.account = null;
  }

  /**
   * Get time remaining until expiration
   */
  getTimeRemaining(): number {
    if (!this.keyData) return 0;
    const remaining = new Date(this.keyData.expiresAt).getTime() - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Extend expiration time
   */
  async extend(additionalHours: number): Promise<void> {
    if (!this.keyData) {
      throw new Error('No ephemeral key loaded');
    }

    const currentExpiry = new Date(this.keyData.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + additionalHours * 60 * 60 * 1000);

    this.keyData.expiresAt = newExpiry.toISOString();
    await this.save();
  }

  private async save(): Promise<void> {
    if (!this.keyData) return;

    if (!existsSync(this.storageDir)) {
      await mkdir(this.storageDir, { recursive: true });
    }

    const keyPath = join(this.storageDir, 'ephemeral-key.json');
    await writeFile(keyPath, JSON.stringify(this.keyData, null, 2));
  }

  private encryptKey(
    privateKey: string,
    password: string
  ): { encrypted: string; salt: string; iv: string } {
    const salt = randomBytes(16);
    const iv = randomBytes(16);
    const key = scryptSync(password, salt, 32);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted + authTag.toString('hex'),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  private decryptKey(
    encrypted: string,
    salt: string,
    iv: string,
    password: string
  ): string {
    const authTag = Buffer.from(encrypted.slice(-32), 'hex');
    const encryptedData = encrypted.slice(0, -32);

    const key = scryptSync(password, Buffer.from(salt, 'hex'), 32);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async getEncryptionPassword(): Promise<string> {
    // In production, use system keychain (keytar)
    // For now, derive from machine ID
    const { hostname, platform, arch } = await import('os');
    return `morpheus-${hostname()}-${platform()}-${arch()}`;
  }
}
