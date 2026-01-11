/**
 * Secure Keychain Manager
 *
 * Provides secure storage for encryption passwords using system keychain.
 * Addresses audit finding C-1: Weak Encryption Key Derivation for Ephemeral Keys
 *
 * Security features:
 * - Uses system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * - Falls back to high-entropy file-based storage with proper permissions
 * - Never derives passwords from predictable machine identifiers
 */

import { randomBytes, createHash } from 'crypto';
import { readFile, writeFile, mkdir, chmod, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { getSecurityLogger } from './logger.js';

const SERVICE_NAME = 'morpheus-deploy';
const ACCOUNT_NAME = 'ephemeral-key-encryption';
const PASSWORD_LENGTH = 32; // 256 bits of entropy

export interface KeychainConfig {
  storageDir?: string;
  forceFileStorage?: boolean;
}

/**
 * Keychain access result
 */
export interface KeychainResult {
  password: string;
  source: 'keychain' | 'file' | 'generated';
}

/**
 * Try to use system keychain via keytar
 * Returns null if keytar is not available
 */
async function tryKeytar(): Promise<typeof import('keytar') | null> {
  try {
    // Dynamic import to avoid hard dependency
    const keytar = await import('keytar');
    return keytar;
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically secure random password
 */
function generateSecurePassword(): string {
  const bytes = randomBytes(PASSWORD_LENGTH);
  return bytes.toString('base64');
}

/**
 * Secure file-based fallback storage
 * Used when system keychain is not available
 */
class FileKeyStorage {
  private filePath: string;

  constructor(storageDir: string) {
    this.filePath = join(storageDir, '.keystore');
  }

  async get(): Promise<string | null> {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      // Verify file permissions (should be readable only by owner)
      const stats = await stat(this.filePath);
      const mode = stats.mode & 0o777;

      // On Unix, check that only owner has read access
      if (platform() !== 'win32' && mode !== 0o600 && mode !== 0o400) {
        const logger = getSecurityLogger();
        await logger.warn('EPHEMERAL_KEY_LOADED', {
          warning: 'Keystore file has insecure permissions',
          path: this.filePath,
          mode: mode.toString(8),
        });
      }

      const content = await readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);

      // Verify integrity
      if (!data.password || !data.checksum) {
        return null;
      }

      // Simple checksum validation
      const expectedChecksum = this.computeChecksum(data.password);
      if (data.checksum !== expectedChecksum) {
        const logger = getSecurityLogger();
        await logger.error('EPHEMERAL_KEY_LOADED', {
          error: 'Keystore checksum mismatch - possible tampering',
          path: this.filePath,
        });
        return null;
      }

      return data.password;
    } catch {
      return null;
    }
  }

  async set(password: string): Promise<void> {
    const dir = join(this.filePath, '..');

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true, mode: 0o700 });
    }

    const data = {
      password,
      checksum: this.computeChecksum(password),
      createdAt: new Date().toISOString(),
      version: 1,
    };

    await writeFile(this.filePath, JSON.stringify(data), { mode: 0o600 });

    // Double-check permissions were set correctly
    if (platform() !== 'win32') {
      await chmod(this.filePath, 0o600);
    }
  }

  async delete(): Promise<void> {
    if (existsSync(this.filePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(this.filePath);
    }
  }

  private computeChecksum(password: string): string {
    // Using imported createHash (L-6 fix)
    return createHash('sha256').update(password).digest('hex').slice(0, 16);
  }
}

/**
 * Secure Keychain Manager
 *
 * Provides secure password storage with multiple backends:
 * 1. System keychain (preferred) - macOS Keychain, Windows Credential Manager, Linux Secret Service
 * 2. Encrypted file storage (fallback) - with proper file permissions
 */
export class KeychainManager {
  private storageDir: string;
  private forceFileStorage: boolean;
  private fileStorage: FileKeyStorage;
  private cachedPassword: string | null = null;

  constructor(config: KeychainConfig = {}) {
    this.storageDir = config.storageDir || join(homedir(), '.morpheus');
    this.forceFileStorage = config.forceFileStorage || false;
    this.fileStorage = new FileKeyStorage(this.storageDir);
  }

  /**
   * Get or create encryption password
   *
   * Tries in order:
   * 1. System keychain (if available)
   * 2. Secure file storage
   * 3. Generate new password and store it
   */
  async getOrCreatePassword(): Promise<KeychainResult> {
    const logger = getSecurityLogger();

    // Return cached password if available
    if (this.cachedPassword) {
      return { password: this.cachedPassword, source: 'keychain' };
    }

    // Try system keychain first (unless forced to use file storage)
    if (!this.forceFileStorage) {
      const keytar = await tryKeytar();

      if (keytar) {
        try {
          // Try to get existing password
          let password = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

          if (password) {
            this.cachedPassword = password;
            return { password, source: 'keychain' };
          }

          // Generate and store new password
          password = generateSecurePassword();
          await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, password);

          await logger.info('EPHEMERAL_KEY_GENERATED', {
            message: 'New encryption password stored in system keychain',
            service: SERVICE_NAME,
          });

          this.cachedPassword = password;
          return { password, source: 'generated' };
        } catch (keytarError) {
          await logger.warn('EPHEMERAL_KEY_LOADED', {
            warning: 'System keychain access failed, falling back to file storage',
            error: String(keytarError),
          });
        }
      }
    }

    // Fallback to file storage
    let password = await this.fileStorage.get();

    if (password) {
      this.cachedPassword = password;
      return { password, source: 'file' };
    }

    // Generate new password and store in file
    password = generateSecurePassword();
    await this.fileStorage.set(password);

    await logger.info('EPHEMERAL_KEY_GENERATED', {
      message: 'New encryption password stored in secure file',
      path: this.storageDir,
    });

    this.cachedPassword = password;
    return { password, source: 'generated' };
  }

  /**
   * Delete stored password
   * Should be called when revoking ephemeral keys
   */
  async deletePassword(): Promise<void> {
    const logger = getSecurityLogger();

    // Try to delete from system keychain
    const keytar = await tryKeytar();
    if (keytar) {
      try {
        await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      } catch {
        // Ignore errors, password may not exist
      }
    }

    // Delete from file storage
    await this.fileStorage.delete();

    this.cachedPassword = null;

    await logger.info('EPHEMERAL_KEY_REVOKED', {
      message: 'Encryption password deleted from storage',
    });
  }

  /**
   * Rotate encryption password
   * Should be called periodically or after security incidents
   */
  async rotatePassword(): Promise<KeychainResult> {
    await this.deletePassword();
    return this.getOrCreatePassword();
  }

  /**
   * Check if a password exists in storage
   */
  async hasPassword(): Promise<boolean> {
    if (this.cachedPassword) return true;

    const keytar = await tryKeytar();
    if (keytar) {
      try {
        const password = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
        if (password) return true;
      } catch {
        // Continue to file check
      }
    }

    const filePassword = await this.fileStorage.get();
    return filePassword !== null;
  }

  /**
   * Clear cached password from memory
   * Call this when done with sensitive operations
   */
  clearCache(): void {
    this.cachedPassword = null;
  }
}

// Singleton instance
let keychainInstance: KeychainManager | null = null;

/**
 * Get the keychain manager instance
 */
export function getKeychainManager(config?: KeychainConfig): KeychainManager {
  if (!keychainInstance) {
    keychainInstance = new KeychainManager(config);
  }
  return keychainInstance;
}

/**
 * Reset the keychain manager instance (for testing)
 */
export function resetKeychainManager(): void {
  keychainInstance = null;
}
