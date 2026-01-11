/**
 * Security Event Logger
 *
 * Provides structured logging for security-sensitive operations.
 * Addresses audit finding L-3: Insufficient Logging for Security Events
 */

import { join } from 'path';
import { homedir } from 'os';

export type SecurityEventType =
  | 'EPHEMERAL_KEY_GENERATED'
  | 'EPHEMERAL_KEY_LOADED'
  | 'EPHEMERAL_KEY_REVOKED'
  | 'ERC20_APPROVAL'
  | 'ERC20_APPROVAL_RESET'
  | 'STAKE_DEPOSIT'
  | 'STAKE_WITHDRAW'
  | 'AUTHZ_GRANT_CREATED'
  | 'AUTHZ_GRANT_REVOKED'
  | 'SMART_WALLET_CREATED'
  | 'TRANSACTION_SUBMITTED'
  | 'TRANSACTION_CONFIRMED'
  | 'TRANSACTION_FAILED'
  | 'SUBNET_VALIDATION_FAILED'
  | 'RPC_FALLBACK'
  | 'GAS_PRICE_CAP_EXCEEDED'
  | 'SPEND_LIMIT_WARNING';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  data: Record<string, unknown>;
  severity: 'info' | 'warn' | 'error' | 'critical';
}

export interface SecurityLoggerConfig {
  enabled: boolean;
  logToConsole: boolean;
  logToFile: boolean;
  logFilePath?: string;
  minSeverity: 'info' | 'warn' | 'error' | 'critical';
}

const DEFAULT_CONFIG: SecurityLoggerConfig = {
  enabled: true,
  logToConsole: process.env.NODE_ENV === 'development',
  logToFile: true,
  minSeverity: 'info',
};

const SEVERITY_LEVELS = {
  info: 0,
  warn: 1,
  error: 2,
  critical: 3,
};

class SecurityLogger {
  private config: SecurityLoggerConfig;
  private events: SecurityEvent[] = [];
  private fileWritePromise: Promise<void> | null = null;

  constructor(config: Partial<SecurityLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log a security event
   */
  async log(
    type: SecurityEventType,
    data: Record<string, unknown>,
    severity: SecurityEvent['severity'] = 'info'
  ): Promise<void> {
    if (!this.config.enabled) return;

    if (SEVERITY_LEVELS[severity] < SEVERITY_LEVELS[this.config.minSeverity]) {
      return;
    }

    const event: SecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data),
      severity,
    };

    this.events.push(event);

    if (this.config.logToConsole) {
      this.logToConsole(event);
    }

    if (this.config.logToFile) {
      await this.logToFile(event);
    }
  }

  /**
   * Log info level event
   */
  info(type: SecurityEventType, data: Record<string, unknown>): Promise<void> {
    return this.log(type, data, 'info');
  }

  /**
   * Log warning level event
   */
  warn(type: SecurityEventType, data: Record<string, unknown>): Promise<void> {
    return this.log(type, data, 'warn');
  }

  /**
   * Log error level event
   */
  error(type: SecurityEventType, data: Record<string, unknown>): Promise<void> {
    return this.log(type, data, 'error');
  }

  /**
   * Log critical level event
   */
  critical(type: SecurityEventType, data: Record<string, unknown>): Promise<void> {
    return this.log(type, data, 'critical');
  }

  /**
   * Get recent events for auditing
   */
  getRecentEvents(count: number = 100): SecurityEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Sanitize data to remove sensitive information before logging
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['privateKey', 'password', 'mnemonic', 'secret', 'key'];

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.startsWith('0x') && value.length === 66) {
        // Likely a private key
        sanitized[key] = `${value.slice(0, 10)}...[REDACTED]`;
      } else if (typeof value === 'bigint') {
        sanitized[key] = value.toString();
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private logToConsole(event: SecurityEvent): void {
    const prefix = `[SECURITY:${event.severity.toUpperCase()}]`;
    const message = `${prefix} ${event.type} - ${JSON.stringify(event.data)}`;

    switch (event.severity) {
      case 'critical':
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }

  private async logToFile(event: SecurityEvent): Promise<void> {
    if (!this.config.logFilePath) return;

    // Queue file writes to avoid race conditions
    const writeOperation = async () => {
      try {
        const { appendFile, mkdir } = await import('fs/promises');
        const { dirname } = await import('path');

        await mkdir(dirname(this.config.logFilePath!), { recursive: true });

        const logLine = JSON.stringify(event) + '\n';
        await appendFile(this.config.logFilePath!, logLine);
      } catch (error) {
        console.error('Failed to write security log:', error);
      }
    };

    this.fileWritePromise = this.fileWritePromise
      ? this.fileWritePromise.then(writeOperation)
      : writeOperation();

    await this.fileWritePromise;
  }
}

// Singleton instance
let loggerInstance: SecurityLogger | null = null;

/**
 * Get the security logger instance
 */
export function getSecurityLogger(config?: Partial<SecurityLoggerConfig>): SecurityLogger {
  if (!loggerInstance) {
    // Using imported join and homedir (L-6 fix)
    loggerInstance = new SecurityLogger({
      logFilePath: join(homedir(), '.morpheus', 'security.log'),
      ...config,
    });
  }
  return loggerInstance;
}

/**
 * Reset the logger instance (for testing)
 */
export function resetSecurityLogger(): void {
  loggerInstance = null;
}
