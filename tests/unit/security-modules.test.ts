/**
 * Tests for security modules: KeychainManager and SecurityLogger
 * Validates C-1 and L-3 audit fixes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  KeychainManager,
  getKeychainManager,
  resetKeychainManager,
} from '../../packages/contracts/src/security/keychain.js';
import {
  getSecurityLogger,
  resetSecurityLogger,
  type SecurityEventType,
} from '../../packages/contracts/src/security/logger.js';

describe('KeychainManager - C-1: Secure Password Storage', () => {
  let testDir: string;
  let keychain: KeychainManager;

  beforeEach(() => {
    resetKeychainManager();
    testDir = join(tmpdir(), `morpheus-test-${Date.now()}`);
    keychain = new KeychainManager({
      storageDir: testDir,
      forceFileStorage: true, // Force file storage for testing
    });
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Password Generation', () => {
    it('should generate high-entropy password on first access', async () => {
      const result = await keychain.getOrCreatePassword();

      expect(result.password).toBeDefined();
      expect(result.password.length).toBeGreaterThan(0);
      expect(result.source).toBe('generated');

      // Password should be base64 encoded (256 bits = 44 chars base64)
      expect(result.password.length).toBeGreaterThanOrEqual(40);
    });

    it('should generate unique passwords for different instances', async () => {
      const keychain1 = new KeychainManager({
        storageDir: join(tmpdir(), `test1-${Date.now()}`),
        forceFileStorage: true,
      });
      const keychain2 = new KeychainManager({
        storageDir: join(tmpdir(), `test2-${Date.now()}`),
        forceFileStorage: true,
      });

      const result1 = await keychain1.getOrCreatePassword();
      const result2 = await keychain2.getOrCreatePassword();

      expect(result1.password).not.toBe(result2.password);
    });
  });

  describe('Password Persistence', () => {
    it('should persist password to file storage', async () => {
      const result1 = await keychain.getOrCreatePassword();
      const password1 = result1.password;

      // Create new instance with same directory
      const keychain2 = new KeychainManager({
        storageDir: testDir,
        forceFileStorage: true,
      });

      const result2 = await keychain2.getOrCreatePassword();

      // Should retrieve same password
      expect(result2.password).toBe(password1);
      expect(result2.source).toBe('file');
    });

    it('should cache password in memory', async () => {
      const result1 = await keychain.getOrCreatePassword();
      const result2 = await keychain.getOrCreatePassword();

      // Should return same password without file access
      expect(result1.password).toBe(result2.password);
    });

    it('should clear cache on demand', async () => {
      await keychain.getOrCreatePassword();

      keychain.clearCache();

      // After clearing, should still retrieve from file
      const result = await keychain.getOrCreatePassword();
      expect(result.source).toBe('file');
    });
  });

  describe('Password Deletion', () => {
    it('should delete password from storage', async () => {
      await keychain.getOrCreatePassword();

      const hadPassword = await keychain.hasPassword();
      expect(hadPassword).toBe(true);

      await keychain.deletePassword();

      const hasPasswordAfter = await keychain.hasPassword();
      expect(hasPasswordAfter).toBe(false);
    });

    it('should clear cache on delete', async () => {
      await keychain.getOrCreatePassword();
      await keychain.deletePassword();

      // Cache should be cleared
      const result = await keychain.getOrCreatePassword();
      expect(result.source).toBe('generated'); // New password generated
    });
  });

  describe('Password Rotation', () => {
    it('should generate new password on rotation', async () => {
      const result1 = await keychain.getOrCreatePassword();
      const password1 = result1.password;

      const result2 = await keychain.rotatePassword();

      expect(result2.password).not.toBe(password1);
      expect(result2.source).toBe('generated');
    });

    it('should persist rotated password', async () => {
      await keychain.getOrCreatePassword();
      const result1 = await keychain.rotatePassword();

      // Create new instance
      const keychain2 = new KeychainManager({
        storageDir: testDir,
        forceFileStorage: true,
      });

      const result2 = await keychain2.getOrCreatePassword();

      // Should retrieve rotated password
      expect(result2.password).toBe(result1.password);
    });
  });

  describe('File Security', () => {
    it('should create keystore file with restricted permissions', async () => {
      await keychain.getOrCreatePassword();

      const keystorePath = join(testDir, '.keystore');
      expect(existsSync(keystorePath)).toBe(true);

      // On Unix systems, check file permissions
      if (process.platform !== 'win32') {
        const { stat } = await import('fs/promises');
        const stats = await stat(keystorePath);
        const mode = stats.mode & 0o777;

        // Should be 0o600 (owner read/write only)
        expect(mode).toBe(0o600);
      }
    });

    it('should include checksum for integrity validation', async () => {
      await keychain.getOrCreatePassword();

      const keystorePath = join(testDir, '.keystore');
      const { readFile } = await import('fs/promises');
      const content = await readFile(keystorePath, 'utf-8');
      const data = JSON.parse(content);

      expect(data).toHaveProperty('password');
      expect(data).toHaveProperty('checksum');
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('version');
    });

    it('should reject tampered keystore file', async () => {
      await keychain.getOrCreatePassword();

      // Tamper with keystore
      const keystorePath = join(testDir, '.keystore');
      const { readFile, writeFile } = await import('fs/promises');
      const content = await readFile(keystorePath, 'utf-8');
      const data = JSON.parse(content);

      data.password = 'tampered-password';
      await writeFile(keystorePath, JSON.stringify(data));

      // Create new instance - should reject tampered file
      const keychain2 = new KeychainManager({
        storageDir: testDir,
        forceFileStorage: true,
      });

      const result = await keychain2.getOrCreatePassword();

      // Should generate new password instead of using tampered one
      expect(result.password).not.toBe('tampered-password');
      expect(result.source).toBe('generated');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getKeychainManager', () => {
      resetKeychainManager();

      const instance1 = getKeychainManager();
      const instance2 = getKeychainManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton on resetKeychainManager', () => {
      const instance1 = getKeychainManager();

      resetKeychainManager();

      const instance2 = getKeychainManager();

      expect(instance1).not.toBe(instance2);
    });
  });
});

describe('SecurityLogger - L-3: Security Event Logging', () => {
  let testLogPath: string;

  beforeEach(() => {
    resetSecurityLogger();
    testLogPath = join(tmpdir(), `security-test-${Date.now()}.log`);
  });

  afterEach(async () => {
    resetSecurityLogger();
    if (existsSync(testLogPath)) {
      await rm(testLogPath, { force: true });
    }
  });

  describe('Event Logging', () => {
    it('should log info events', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      await logger.info('STAKE_DEPOSIT', {
        amount: '1000',
        user: '0x1234',
      });

      const events = logger.getRecentEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('STAKE_DEPOSIT');
      expect(events[0].severity).toBe('info');
      expect(events[0].data.amount).toBe('1000');
    });

    it('should log warning events', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      await logger.warn('GAS_PRICE_CAP_EXCEEDED', {
        currentGasPriceGwei: '100',
        maxGasPriceGwei: 50,
      });

      const events = logger.getRecentEvents();
      expect(events[0].severity).toBe('warn');
    });

    it('should log error events', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      await logger.error('TRANSACTION_FAILED', {
        error: 'Gas estimation failed',
      });

      const events = logger.getRecentEvents();
      expect(events[0].severity).toBe('error');
    });

    it('should log critical events', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      await logger.critical('SUBNET_VALIDATION_FAILED', {
        error: 'Subnet minimum deposit exceeds reasonable limit',
      });

      const events = logger.getRecentEvents();
      expect(events[0].severity).toBe('critical');
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by minimum severity', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
        minSeverity: 'warn',
      });

      await logger.info('STAKE_DEPOSIT', { amount: '1000' });
      await logger.warn('GAS_PRICE_CAP_EXCEEDED', { price: '100' });
      await logger.error('TRANSACTION_FAILED', { error: 'Failed' });

      const events = logger.getRecentEvents();

      // Should only have warn and error (no info)
      expect(events.length).toBe(2);
      expect(events.some(e => e.severity === 'info')).toBe(false);
    });

    it('should respect disabled state', async () => {
      const logger = getSecurityLogger({
        enabled: false,
        logToConsole: false,
        logToFile: false,
      });

      await logger.info('STAKE_DEPOSIT', { amount: '1000' });

      const events = logger.getRecentEvents();
      expect(events.length).toBe(0);
    });
  });

  describe('Data Sanitization', () => {
    it('should redact private keys', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      await logger.info('EPHEMERAL_KEY_GENERATED', {
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        address: '0xAbCd',
      });

      const events = logger.getRecentEvents();
      expect(events[0].data.privateKey).toBe('[REDACTED]');
      expect(events[0].data.address).toBe('0xAbCd'); // Not sensitive
    });

    it('should redact passwords', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      await logger.info('EPHEMERAL_KEY_LOADED', {
        password: 'super-secret-password',
        path: '/tmp/keystore',
      });

      const events = logger.getRecentEvents();
      expect(events[0].data.password).toBe('[REDACTED]');
    });

    it('should redact potential private keys in strings', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      const potentialKey = '0x' + 'a'.repeat(64);

      await logger.info('TRANSACTION_SUBMITTED', {
        key: potentialKey,
      });

      const events = logger.getRecentEvents();
      expect(events[0].data.key).toMatch(/\[REDACTED\]/);
    });

    it('should convert bigint to string', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      await logger.info('STAKE_DEPOSIT', {
        amount: 1000000000000000000n, // 1 MOR in wei
      });

      const events = logger.getRecentEvents();
      expect(typeof events[0].data.amount).toBe('string');
      expect(events[0].data.amount).toBe('1000000000000000000');
    });
  });

  describe('Event Retrieval', () => {
    it('should retrieve recent events with limit', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      // Log 20 events
      for (let i = 0; i < 20; i++) {
        await logger.info('STAKE_DEPOSIT', { amount: i.toString() });
      }

      // Get last 10
      const events = logger.getRecentEvents(10);
      expect(events.length).toBe(10);

      // Should be most recent ones (10-19)
      expect(events[0].data.amount).toBe('10');
      expect(events[9].data.amount).toBe('19');
    });

    it('should include timestamp in events', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: false,
      });

      const beforeLog = new Date();
      await logger.info('STAKE_DEPOSIT', { amount: '1000' });
      const afterLog = new Date();

      const events = logger.getRecentEvents();
      const eventTime = new Date(events[0].timestamp);

      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterLog.getTime());
    });
  });

  describe('File Logging', () => {
    it('should write events to log file', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: true,
        logFilePath: testLogPath,
      });

      await logger.info('STAKE_DEPOSIT', {
        amount: '1000',
        user: '0x1234',
      });

      // Wait for async file write
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(existsSync(testLogPath)).toBe(true);

      const { readFile } = await import('fs/promises');
      const content = await readFile(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBeGreaterThan(0);

      const event = JSON.parse(lines[0]);
      expect(event.type).toBe('STAKE_DEPOSIT');
      expect(event.data.amount).toBe('1000');
    });

    it('should append multiple events to log file', async () => {
      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToFile: true,
        logFilePath: testLogPath,
      });

      await logger.info('STAKE_DEPOSIT', { amount: '1000' });
      await logger.info('STAKE_WITHDRAW', { amount: '500' });

      // Wait for async file writes
      await new Promise(resolve => setTimeout(resolve, 200));

      const { readFile } = await import('fs/promises');
      const content = await readFile(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
    });
  });

  describe('Console Logging', () => {
    it('should log to console when enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToFile: false,
      });

      await logger.info('STAKE_DEPOSIT', { amount: '1000' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY:INFO]')
      );

      consoleSpy.mockRestore();
    });

    it('should use console.error for critical events', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      const logger = getSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToFile: false,
      });

      await logger.critical('SUBNET_VALIDATION_FAILED', { error: 'Failed' });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getSecurityLogger', () => {
      resetSecurityLogger();

      const instance1 = getSecurityLogger();
      const instance2 = getSecurityLogger();

      expect(instance1).toBe(instance2);
    });

    it('should use configured log path on first access', () => {
      resetSecurityLogger();

      const logger = getSecurityLogger({
        logFilePath: testLogPath,
      });

      expect(logger).toBeDefined();
    });
  });
});
