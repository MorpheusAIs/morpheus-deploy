# Morpheus Deploy - Security Audit Report v2

**Audit Date:** January 11, 2026
**Version:** 2.0
**Auditor:** Claude Security Analysis
**Scope:** TypeScript integration layer for blockchain contracts

## Executive Summary

This is a follow-up security audit conducted after implementing fixes for all issues identified in Security Audit Report v1. The audit verifies the effectiveness of implemented fixes and identifies any residual or newly introduced issues.

### Fix Verification Summary

| Finding | Severity | Status | Notes |
|---------|----------|--------|-------|
| C-1: Weak Encryption Key Derivation | Critical | **FIXED** | KeychainManager implemented |
| H-1: Unlimited ERC-20 Approvals | High | **FIXED** | Two-step approval with caps |
| H-2: Insufficient Private Key Entropy | High | **FIXED** | secp256k1 validation added |
| H-3: Missing Transaction Deadlines | High | **FIXED** | Deadline validation implemented |
| H-4: No Subnet Validation | High | **FIXED** | Subnet config validation added |
| M-1: Incomplete Event Parsing | Medium | **FIXED** | Using viem's parseEventLogs |
| M-2: AuthZ Spend Limit Not Enforced | Medium | **FIXED** | Spend tracking system implemented |
| M-3: Missing Mainnet Guards | Medium | **FIXED** | MAINNET_ENABLED flag added |
| M-4: CREATE2 Address Not Verified | Medium | **FIXED** | Factory verification added |
| M-5: No Gas Price Oracle | Medium | **PARTIAL** | Config exists but not validated |
| L-1: No RPC Fallbacks | Low | **FIXED** | rpcUrls array configured |
| L-2: No Deprecation Warnings | Low | **FIXED** | console.warn added |
| L-3: Insufficient Logging | Low | **FIXED** | SecurityLogger implemented |

### New Findings in v2

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| M-5r | Medium | Gas price cap not enforced | Open |
| L-4 | Low | Ephemeral key file permissions | Open |
| L-5 | Low | Spend tracking file permissions | Open |
| L-6 | Low | Synchronous require() in keychain | Open |

---

## Detailed Findings

### M-5r: Gas Price Cap Not Enforced (Medium) - Residual

**Location:** `packages/contracts/src/staking/morpheus.ts:166`

**Description:**
The security configuration includes a `maxGasPriceGwei` parameter, but it is stored without being validated or enforced during transaction submission. This allows transactions to be submitted with arbitrarily high gas prices.

**Current Code:**
```typescript
// Line 166: Config is stored but never validated
this.securityConfig = {
  maxApprovalCap: config.security?.maxApprovalCap ?? DEFAULT_MAX_APPROVAL_CAP,
  deadlineMs: config.security?.deadlineMs ?? DEFAULT_DEADLINE_MS,
  maxGasPriceGwei: config.security?.maxGasPriceGwei ?? 0, // NOT VALIDATED
  skipApprovalReset: config.security?.skipApprovalReset ?? false,
};

// Gas price passed to writeContract without validation
const hash = await this.walletClient.writeContract({
  // ...
  ...(options?.maxFeePerGas && { maxFeePerGas: options.maxFeePerGas }), // No cap check
});
```

**Risk:** An attacker or misconfigured client could submit transactions with very high gas fees, leading to financial loss.

**Recommendation:**
```typescript
private async validateGasPrice(): Promise<void> {
  if (this.securityConfig.maxGasPriceGwei > 0) {
    const gasPrice = await this.publicClient.getGasPrice();
    const maxGasWei = BigInt(this.securityConfig.maxGasPriceGwei) * 10n ** 9n;

    if (gasPrice > maxGasWei) {
      throw new Error(
        `Current gas price ${gasPrice / 10n ** 9n} gwei exceeds ` +
        `cap of ${this.securityConfig.maxGasPriceGwei} gwei`
      );
    }
  }
}
```

---

### L-4: Ephemeral Key File Permissions (Low)

**Location:** `packages/contracts/src/wallet/ephemeral-key.ts:238`

**Description:**
The ephemeral key JSON file is written without setting restrictive file permissions. On Unix systems, this may leave the file readable by other users on the system.

**Current Code:**
```typescript
// Line 238 - No mode specified
await writeFile(keyPath, JSON.stringify(this.keyData, null, 2));
```

**Risk:** Other users on a shared system could potentially read the encrypted key data.

**Recommendation:**
```typescript
await writeFile(keyPath, JSON.stringify(this.keyData, null, 2), { mode: 0o600 });
```

---

### L-5: Spend Tracking File Permissions (Low)

**Location:** `packages/contracts/src/authz/manager.ts:601`

**Description:**
The AuthZ spend tracking files are written without restrictive file permissions.

**Current Code:**
```typescript
// Line 601 - No mode specified
await writeFile(filePath, JSON.stringify(data, null, 2));
```

**Risk:** Spend tracking data could be read or modified by other users on a shared system.

**Recommendation:**
```typescript
await writeFile(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
```

---

### L-6: Synchronous require() in Keychain (Low)

**Location:** `packages/contracts/src/security/keychain.ts:145`

**Description:**
The keychain module uses synchronous `require()` instead of proper ES module imports for the crypto module.

**Current Code:**
```typescript
private computeChecksum(password: string): string {
  const { createHash } = require('crypto'); // Synchronous require
  return createHash('sha256').update(password).digest('hex').slice(0, 16);
}
```

**Risk:** Inconsistent with the rest of the codebase and could cause issues with certain bundlers or strict ES module environments.

**Recommendation:**
Import at the top of the file:
```typescript
import { createHash } from 'crypto';
```

---

## Verified Fixes

### C-1: Weak Encryption Key Derivation - FIXED

**File:** `packages/contracts/src/security/keychain.ts`

The new KeychainManager provides secure password storage:
- Primary: System keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Fallback: Secure file storage with proper permissions (0o600)
- Password generation uses `randomBytes(32)` for 256 bits of entropy
- Checksum validation to detect tampering
- Password rotation capability

### H-1: Unlimited ERC-20 Approvals - FIXED

**File:** `packages/contracts/src/staking/morpheus.ts:547-625`

The `approveWithSafetyChecks()` method now implements:
- Approval cap validation (default: 10,000 MOR)
- Two-step approval: reset to 0, then approve exact amount
- Post-approval verification
- Security event logging

### H-2: Insufficient Private Key Entropy - FIXED

**File:** `packages/contracts/src/wallet/smart-wallet.ts:327-358`

The `generateSecurePrivateKey()` method now:
- Uses `crypto.randomBytes(32)` for strong entropy
- Validates key is within secp256k1 curve order [1, n-1]
- Retries on invalid keys (astronomically rare)
- Throws on repeated failures (indicates RNG problem)

### H-3: Missing Transaction Deadlines - FIXED

**File:** `packages/contracts/src/staking/morpheus.ts:49-56, 453-460`

Transaction options now include deadline support:
- Default deadline: 10 minutes from now
- Deadline validation before and after transaction
- Warning if transaction confirms after deadline
- Timeout tied to deadline for `waitForTransactionReceipt`

### H-4: No Subnet Validation - FIXED

**File:** `packages/contracts/src/staking/morpheus.ts:466-502`

The `validateSubnetConfig()` method validates:
- Admin address exists (subnet is active)
- Subnet name is set (properly initialized)
- Minimum deposit is reasonable (DoS protection)

### M-1: Incomplete Event Parsing - FIXED

**File:** `packages/contracts/src/staking/morpheus.ts:634-686`

The `parseDepositEventSafe()` method now:
- Uses viem's `parseEventLogs()` for reliable parsing
- Validates event matches expected subnet
- Warns if deposited amount differs from expected
- Logs errors and falls back to expected amount on failure

### M-2: AuthZ Spend Limit Not Enforced - FIXED

**File:** `packages/contracts/src/authz/manager.ts:358-462`

Complete spend tracking system implemented:
- Lifetime spending limits with validation
- Warning threshold alerts (default: 80%)
- Rate limiting (default: 10 transactions/hour)
- Transaction history tracking
- Spend status reporting

### M-3: Missing Mainnet Guards - FIXED

**File:** `packages/contracts/src/constants.ts:13` and `packages/contracts/src/staking/morpheus.ts:420-447`

Mainnet protection implemented:
- `MAINNET_ENABLED` feature flag (currently `false`)
- Subnet ID validation
- MOR token address validation
- Clear error messages directing users to testnet

### M-4: CREATE2 Address Not Verified - FIXED

**File:** `packages/contracts/src/wallet/smart-wallet.ts:253-316`

Factory verification implemented:
- `verifyFactoryContract()` validates factory is a contract
- `verifyFactoryContract()` validates factory matches expected address
- `computeSmartWalletAddressSafe()` validates returned address format
- Zero address detection

### L-1: No RPC Fallbacks - FIXED

**File:** `packages/contracts/src/constants.ts:19-46`

Multiple RPC URLs configured:
- Mainnet: 4 fallback URLs
- Testnet: 3 fallback URLs

### L-2: No Deprecation Warnings - FIXED

**File:** `packages/contracts/src/staking/morpheus.ts:327-414`

Deprecation warnings added for Builders V4 incompatible methods:
- `claimRewards()`: console.warn + error
- `getAPY()`: console.warn + error
- `sharesToMOR()`: console.warn + 1:1 return

### L-3: Insufficient Logging - FIXED

**File:** `packages/contracts/src/security/logger.ts`

SecurityLogger implemented with:
- Structured event logging
- Severity levels (info, warn, error, critical)
- Sensitive data sanitization
- Console and file output options
- Event history for auditing

---

## Risk Summary

### Current Risk Profile

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | All fixed |
| High | 0 | All fixed |
| Medium | 1 | M-5r open |
| Low | 3 | L-4, L-5, L-6 open |

### Recommendations

1. **Immediate**: Implement gas price validation (M-5r)
2. **Short-term**: Add file permissions for sensitive data (L-4, L-5)
3. **Housekeeping**: Fix synchronous require (L-6)

---

## Conclusion

The v1 audit findings have been largely addressed with robust implementations. The remaining issues are low to medium severity and do not represent critical security vulnerabilities. The gas price cap (M-5r) should be prioritized as it could lead to financial loss, while the file permission issues (L-4, L-5) are relevant primarily in shared system environments.

**Overall Security Posture:** Good (improved from v1)
