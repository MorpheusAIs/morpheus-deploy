/**
 * Security Module
 *
 * This module provides security utilities for the Morpheus Deploy contracts package.
 * It addresses multiple audit findings related to key management, logging, and encryption.
 *
 * @module security
 */

export {
  getSecurityLogger,
  resetSecurityLogger,
  type SecurityEventType,
  type SecurityEvent,
  type SecurityLoggerConfig,
} from './logger.js';

export {
  getKeychainManager,
  resetKeychainManager,
  KeychainManager,
  type KeychainConfig,
  type KeychainResult,
} from './keychain.js';
