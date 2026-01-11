import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { readFile, writeFile, mkdir, chmod } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { getKeychainManager, type KeychainManager } from '../security/keychain.js';
import { getSecurityLogger } from '../security/logger.js';

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
  private keychainManager: KeychainManager;

  constructor(config: EphemeralKeyConfig = {}) {
    this.storageDir = config.storageDir || join(homedir(), '.morpheus');
    this.expirationMs = (config.expirationHours || 24) * 60 * 60 * 1000;
    this.keychainManager = getKeychainManager({ storageDir: this.storageDir });
  }

  /**
   * Generate a new ephemeral key
   *
   * Security: Uses secure keychain for encryption password storage
   * Addresses audit finding C-1
   */
  async generate(permissions: string[]): Promise<EphemeralKeyData> {
    const logger = getSecurityLogger();
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // Get encryption password from secure keychain (fixes C-1)
    const { password, source } = await this.keychainManager.getOrCreatePassword();
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

    // Log security event (addresses L-3)
    await logger.info('EPHEMERAL_KEY_GENERATED', {
      address: account.address,
      permissions,
      expiresAt: expiresAt.toISOString(),
      passwordSource: source,
    });

    return this.keyData;
  }

  /**
   * Load existing ephemeral key
   *
   * Security: Uses secure keychain for encryption password retrieval
   * Addresses audit finding C-1
   */
  async load(): Promise<EphemeralKeyData | null> {
    const logger = getSecurityLogger();
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

      // Get encryption password from secure keychain (fixes C-1)
      const { password } = await this.keychainManager.getOrCreatePassword();
      const privateKey = this.decryptKey(
        this.keyData.encryptedPrivateKey,
        this.keyData.salt,
        this.keyData.iv,
        password
      );

      this.account = privateKeyToAccount(privateKey as `0x${string}`);

      // Log security event (addresses L-3)
      await logger.info('EPHEMERAL_KEY_LOADED', {
        address: this.keyData.address,
        expiresAt: this.keyData.expiresAt,
        permissions: this.keyData.permissions,
      });

      return this.keyData;
    } catch (error) {
      await logger.error('EPHEMERAL_KEY_LOADED', {
        error: 'Failed to load ephemeral key',
        details: String(error),
      });
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
   *
   * Security: Also cleans up keychain password storage
   * Addresses audit finding C-1
   */
  async revoke(): Promise<void> {
    const logger = getSecurityLogger();
    const keyPath = join(this.storageDir, 'ephemeral-key.json');
    const revokedAddress = this.keyData?.address;

    if (existsSync(keyPath)) {
      const { unlink } = await import('fs/promises');
      await unlink(keyPath);
    }

    // Clean up keychain password (fixes C-1)
    await this.keychainManager.deletePassword();

    this.keyData = null;
    this.account = null;

    // Log security event (addresses L-3)
    if (revokedAddress) {
      await logger.info('EPHEMERAL_KEY_REVOKED', {
        address: revokedAddress,
      });
    }
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
      await mkdir(this.storageDir, { recursive: true, mode: 0o700 });
    }

    const keyPath = join(this.storageDir, 'ephemeral-key.json');

    // Write with restrictive permissions (L-4 fix)
    await writeFile(keyPath, JSON.stringify(this.keyData, null, 2), { mode: 0o600 });

    // Ensure permissions are set correctly on Unix systems
    if (platform() !== 'win32') {
      await chmod(keyPath, 0o600);
    }
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

  // NOTE: getEncryptionPassword() removed - was using insecure machine-ID derivation
  // Now using secure KeychainManager (see C-1 audit fix)
}
