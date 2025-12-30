# Smart Wallet Guide

This guide explains how Morpheus uses Coinbase Smart Wallet for secure, passkey-based authentication.

## Overview

Morpheus uses ERC-4337 Smart Wallets instead of traditional private key wallets. This provides:

- **No Seed Phrases** - Your biometric (Face ID, Touch ID, Windows Hello) IS your wallet
- **Account Abstraction** - Pay gas fees in any token, batch transactions
- **Social Recovery** - Add backup recovery methods
- **Ephemeral Keys** - Limited-permission keys that auto-expire

## How It Works

### Passkey Authentication

When you create a wallet, a WebAuthn passkey is generated and stored in your device's secure enclave:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Biometric    │────▶│  Secure Enclave │────▶│    WebAuthn     │
│   (Face/Touch)  │     │  (Device TPM)   │     │    Passkey      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Smart Wallet   │◀────│   Factory       │◀────│   Signature     │
│   (ERC-4337)    │     │   Contract      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Smart Wallet Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                     Coinbase Smart Wallet                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Owner Verification                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │
│  │  │   Passkey   │  │   Backup    │  │   Social    │         │ │
│  │  │   Owner     │  │   Key       │  │   Recovery  │         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Execution Layer                           │ │
│  │  • Transaction batching                                      │ │
│  │  • Gas sponsorship                                          │ │
│  │  • Permission management                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Address: 0x1234...abcd (deterministic from passkey)             │
│  Network: Base (Chain ID: 8453)                                  │
└───────────────────────────────────────────────────────────────────┘
```

## Wallet Setup

### Creating a New Wallet

```bash
# Interactive wallet creation
morpheus init

# The CLI will prompt:
# 1. Authenticate with biometric (Face ID/Touch ID)
# 2. Confirm wallet creation
# 3. Optionally add backup methods
```

### Wallet File Structure

Wallet data is stored in `~/.morpheus/wallet.json`:

```json
{
  "version": 1,
  "type": "smart-wallet",
  "address": "0x1234567890abcdef...",
  "network": {
    "chainId": 8453,
    "name": "base"
  },
  "passkeyId": "credential-id-from-webauthn",
  "createdAt": "2024-01-15T10:30:00Z",
  "ephemeralKeys": [
    {
      "id": "eph-001",
      "publicKey": "0xabcd...",
      "encryptedPrivateKey": "encrypted:...",
      "permissions": ["deployment"],
      "expiresAt": "2024-01-16T10:30:00Z"
    }
  ]
}
```

### Multiple Wallets

You can manage multiple wallets:

```bash
# List wallets
ls ~/.morpheus/wallets/

# Use specific wallet
morpheus deploy --wallet ~/.morpheus/wallets/production.json

# Set default wallet
export MORPHEUS_WALLET_PATH=~/.morpheus/wallets/staging.json
```

## Ephemeral Keys

Ephemeral keys are temporary keys with limited permissions, used for deployment operations.

### Why Ephemeral Keys?

| Traditional Key | Ephemeral Key |
|-----------------|---------------|
| Full access forever | Limited permissions |
| If compromised, total loss | If compromised, limited damage |
| Requires constant security | Auto-expires after 24 hours |
| Single point of failure | Revocable at any time |

### Permission Model

Ephemeral keys can only perform deployment-related operations:

```typescript
const EPHEMERAL_PERMISSIONS = [
  '/akash.deployment.v1beta3.MsgCreateDeployment',
  '/akash.deployment.v1beta3.MsgUpdateDeployment',
  '/akash.deployment.v1beta3.MsgCloseDeployment',
  '/akash.deployment.v1beta3.MsgDepositDeployment',
];

// These are BLOCKED for ephemeral keys:
// - Transferring funds
// - Changing wallet ownership
// - Granting new permissions
// - Any other message types
```

### Ephemeral Key Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ephemeral Key Lifecycle                      │
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌────────┐ │
│  │  Create  │────▶│  Grant   │────▶│   Use    │────▶│ Expire │ │
│  │          │     │  AuthZ   │     │          │     │        │ │
│  └──────────┘     └──────────┘     └──────────┘     └────────┘ │
│       │                │                │                │      │
│       │                │                │                │      │
│  Generate key    Grant perms      Deploy/Update     Auto-revoke │
│  Encrypt store   to ephemeral     operations        after 24h   │
│                  from master                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Managing Ephemeral Keys

```bash
# List active ephemeral keys
morpheus wallet keys list

# Create new ephemeral key
morpheus wallet keys create --duration 24h

# Revoke specific key
morpheus wallet keys revoke eph-001

# Revoke all keys
morpheus wallet keys revoke --all
```

## AuthZ Grants

AuthZ (Authorization) is a Cosmos SDK module that allows one account to grant limited permissions to another.

### How AuthZ Works

```
┌────────────────┐                    ┌────────────────┐
│  Smart Wallet  │                    │ Ephemeral Key  │
│   (Granter)    │                    │   (Grantee)    │
│                │                    │                │
│  Can do:       │     AuthZ Grant    │  Can do:       │
│  - Everything  │───────────────────▶│  - Create      │
│                │                    │  - Update      │
│                │                    │  - Close       │
│                │                    │  - Deposit     │
│                │                    │                │
│                │                    │  Cannot do:    │
│                │                    │  - Transfer    │
│                │                    │  - Grant perms │
└────────────────┘                    └────────────────┘
```

### Grant Structure

```typescript
interface AuthZGrant {
  granter: string;        // Smart wallet address
  grantee: string;        // Ephemeral key address
  authorization: {
    '@type': '/cosmos.authz.v1beta1.GenericAuthorization';
    msg: string;          // Message type URL
  };
  expiration: Date;       // When grant expires
}
```

### Viewing Grants

```bash
# Query grants from your wallet
morpheus wallet grants list

# Output:
# Granter: akash1master...
# Grantee: akash1ephemeral...
# Permissions:
#   - MsgCreateDeployment (expires: 2024-01-16T10:30:00Z)
#   - MsgUpdateDeployment (expires: 2024-01-16T10:30:00Z)
#   - MsgCloseDeployment (expires: 2024-01-16T10:30:00Z)
#   - MsgDepositDeployment (expires: 2024-01-16T10:30:00Z)
```

## Cross-Chain Operations

Your Smart Wallet on Base can fund deployments on Akash through cross-chain swaps.

### Funding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cross-Chain Funding                          │
│                                                                 │
│  Base Network                      Akash Network                │
│  ─────────────                     ─────────────                │
│                                                                 │
│  ┌──────────────┐                  ┌──────────────┐            │
│  │Smart Wallet  │                  │Akash Account │            │
│  │              │                  │              │            │
│  │ USDC Balance │─────────────────▶│ AKT Balance  │            │
│  │              │    Skip Go       │              │            │
│  │              │    Swap          │              │            │
│  └──────────────┘                  └──────────────┘            │
│                                           │                     │
│                                           ▼                     │
│                                    ┌──────────────┐            │
│                                    │Deployment    │            │
│                                    │Escrow        │            │
│                                    └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Supported Tokens

| Token | Network | Usage |
|-------|---------|-------|
| USDC | Base | Primary funding currency |
| ETH | Base | Gas fees |
| AKT | Akash | Deployment escrow |

### Balance Checking

```bash
# Check wallet balances
morpheus wallet balance

# Output:
# Smart Wallet: 0x1234...abcd
#
# Base Network:
#   ETH:  0.05
#   USDC: 150.00
#
# Akash Network (via ephemeral):
#   AKT:  25.50
```

## Security Best Practices

### DO

- **Use biometric authentication** - Don't disable Face ID/Touch ID
- **Keep device secure** - Your device security IS your wallet security
- **Monitor deployments** - Set up alerts for escrow balance
- **Rotate ephemeral keys** - Don't reuse expired keys
- **Use testnet first** - Test with sandbox before mainnet

### DON'T

- **Don't share wallet files** - `wallet.json` contains encrypted keys
- **Don't use development wallets** - They have weak encryption
- **Don't disable key expiration** - Ephemeral keys should expire
- **Don't store plaintext secrets** - Use sealed secrets for env vars

### Recovery Options

1. **Passkey Backup** - iCloud Keychain, Google Password Manager
2. **Backup Owner** - Add a second passkey or hardware key
3. **Social Recovery** - Configure trusted contacts (future feature)

```bash
# Add backup owner
morpheus wallet owners add --type passkey

# List owners
morpheus wallet owners list

# Remove owner (requires majority approval)
morpheus wallet owners remove <owner-id>
```

## Troubleshooting

### "Passkey not found"

```bash
# Re-register passkey
morpheus wallet recover --method passkey

# Or import from backup
morpheus wallet import --file backup.json
```

### "Ephemeral key expired"

```bash
# Create new ephemeral key
morpheus wallet keys create

# Then retry deployment
morpheus deploy
```

### "Insufficient balance"

```bash
# Check balances
morpheus wallet balance

# Fund from external wallet
# 1. Get your Smart Wallet address
morpheus wallet address

# 2. Send USDC to that address on Base network
```

### "AuthZ grant not found"

```bash
# Re-grant permissions to ephemeral key
morpheus wallet keys refresh

# Or create new key with fresh grants
morpheus wallet keys create --force
```

## API Reference

### SmartWalletManager

```typescript
class SmartWalletManager {
  // Create new smart wallet
  async createSmartWallet(): Promise<WalletInfo>;

  // Get wallet address
  getAddress(): Address;

  // Get balance for token
  async getBalance(token: 'ETH' | 'USDC'): Promise<bigint>;

  // Send transaction
  async sendTransaction(tx: TransactionRequest): Promise<Hash>;

  // Sign message
  async signMessage(message: string): Promise<Signature>;
}
```

### EphemeralKeyManager

```typescript
class EphemeralKeyManager {
  // Generate new ephemeral key
  async generate(config: EphemeralKeyConfig): Promise<EphemeralKey>;

  // Load existing key
  async load(keyId: string, password: string): Promise<EphemeralKey>;

  // Revoke key
  async revoke(keyId: string): Promise<void>;

  // List active keys
  async list(): Promise<EphemeralKeyInfo[]>;
}
```

### AuthZManager

```typescript
class AuthZManager {
  // Grant permissions
  async grantPermissions(
    granter: string,
    grantee: string,
    permissions: AuthZPermission[],
    expiration: Date
  ): Promise<TxHash>;

  // Revoke all grants
  async revokeAllGrants(granter: string, grantee: string): Promise<TxHash>;

  // Query grants
  async queryGrants(granter: string): Promise<AuthZGrant[]>;
}
```
