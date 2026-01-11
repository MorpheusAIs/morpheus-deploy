# Staking Contract Migration to Builders V4

## Overview

This document explains the migration of the Morpheus Deploy staking system from a custom staking contract to Builders V4, a subnet-based staking infrastructure on Base.

## Why Builders V4?

### Previous Architecture

The original staking implementation was designed for a custom staking contract with:
- Direct MOR token staking
- Share-based system (shares to MOR conversion)
- Built-in APY calculation
- Reward claiming mechanism

However, this contract was never deployed, leaving the staking addresses as placeholders (`0x000...`).

### Builders V4 Benefits

Builders V4 provides a **subnet-based staking infrastructure** that offers several advantages:

1. **Already Deployed**: Builders V4 is a production-ready, audited contract system already deployed on Base Mainnet and Base Sepolia
2. **Subnet Architecture**: Uses a subnet model where each project can have its own isolated staking pool
3. **Infrastructure Management**: Designed specifically for managing infrastructure staking (perfect for Morpheus Deploy's use case)
4. **Proven System**: Used by multiple projects on Base, reducing deployment risk
5. **Flexible Configuration**: Subnet admins can configure withdrawal lock periods, minimum deposits, and other parameters

## Technical Changes

### Contract Addresses

**Base Sepolia (Testnet)**:
- **Registry Contract**: `0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381`
- **Subnet ID**: `0xab4d64309bda15052e3e9133923a6b3d3b617bea4ab70a8d1bbebb3e94c1bf22`

**Base Mainnet**:
- **Registry Contract**: `0x42bb446eae6dca7723a9ebdb81ea88afe77ef4b9`
- **Subnet ID**: `0x0000000000000000000000000000000000000000000000000000000000000000` (TBD)

### Subnet Creation Transaction

The Morpheus Deploy subnet was created on Base Sepolia via transaction:
- **Transaction Hash**: `0xe10bc2b48e024bac539f303a020abb68f34a8f4ab57cd8b68edf258cc70e366d`
- **Subnet Name**: "Morpheus Deploy"
- **Description**: "Smart contract driven staking pool for managing the Morpheus Deploy infrastructure"

### Function Signature Changes

#### Old Interface (Not Deployed)
```solidity
function stake(uint256 amount) external returns (uint256 shares);
function unstake(uint256 shares) external returns (uint256 amount);
function claimRewards() external returns (uint256 amount);
function getAPY() external view returns (uint256);
```

#### New Interface (Builders V4)
```solidity
function deposit(bytes32 subnetId_, uint256 amount_) external;
function withdraw(bytes32 subnetId_, uint256 amount_) external;
function getUserDeposit(bytes32 subnetId_, address user_) external view returns (uint256);
function getSubnetDeposit(bytes32 subnetId_) external view returns (uint256);
function subnets(bytes32 subnetId_) external view returns (Subnet memory);
```

### Key Differences

1. **Subnet-Based**: All operations require a `subnetId` parameter (32-byte identifier)
2. **Direct Deposits**: No share conversion - deposits are 1:1 with MOR tokens
3. **No Built-in APY**: APY calculation must be done externally or through subnet economics
4. **No Direct Rewards**: Rewards are managed by the subnet admin or through other mechanisms
5. **Lock Periods**: Subnet configuration includes `withdrawLockPeriodAfterDeposit` for withdrawal timing

## Implementation Details

### Address Format

- **Contract Address**: 20-byte Ethereum address (40 hex characters)
  - Example: `0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381`

- **Subnet ID**: 32-byte bytes32 value (64 hex characters)
  - Example: `0xab4d64309bda15052e3e9133923a6b3d3b617bea4ab70a8d1bbebb3e94c1bf22`

### Deposit Flow

```typescript
// 1. User approves MOR token spending
await morToken.approve(stakingAddress, amount);

// 2. Call deposit with subnet ID
await stakingContract.deposit(subnetId, amount);

// 3. Event emitted: UserDeposited(subnetId, user, amount)
```

### Withdrawal Flow

```typescript
// 1. Check lock period from subnet config
const subnet = await stakingContract.subnets(subnetId);
const lockPeriod = subnet.withdrawLockPeriodAfterDeposit;

// 2. Wait for lock period to expire (if applicable)

// 3. Call withdraw with subnet ID
await stakingContract.withdraw(subnetId, amount);

// 4. Event emitted: UserWithdrawn(subnetId, user, amount)
```

## Code Changes

### ABI Updates (`packages/contracts/src/staking/abi.ts`)

- Added `SUBNET_ID` constant for both mainnet and testnet
- Replaced custom staking ABI with Builders V4 ABI
- Updated function signatures to include `subnetId` parameter

### Implementation Updates (`packages/contracts/src/staking/morpheus.ts`)

- `stake()` → calls `deposit(subnetId, amount)`
- `unstake()` → calls `withdraw(subnetId, amount)`
- `getPosition()` → uses `getUserDeposit(subnetId, address)` and `subnets(subnetId)`
- `getTotalStaked()` → uses `getSubnetDeposit(subnetId)`
- `claimRewards()` → throws error (not available in Builders V4)
- `getAPY()` → throws error (must be calculated externally)
- `sharesToMOR()` → returns 1:1 (no share conversion)

## Migration Considerations

### Breaking Changes

1. **API Compatibility**: The public API remains compatible, but internal implementation changed
2. **Rewards**: Direct reward claiming is no longer available
3. **APY**: Must be calculated externally based on subnet economics
4. **Shares**: No longer uses a share-based system

### Backward Compatibility

The `MorpheusStaking` class maintains the same public interface, so existing code using the staking SDK will continue to work:

```typescript
const staking = new MorpheusStaking({ network: 'testnet' }, privateKey);
await staking.stake(amount); // Still works, now uses Builders V4
const position = await staking.getPosition(address); // Still works
```

## Future Enhancements

1. **Mainnet Subnet**: Deploy and configure the mainnet subnet ID
2. **APY Calculation**: Implement external APY calculation based on subnet economics
3. **Reward Distribution**: If rewards are needed, implement via subnet admin or separate contract
4. **Monitoring**: Add monitoring for subnet deposits and withdrawals

## References

- [Base Sepolia Transaction](https://sepolia.basescan.org/tx/0xe10bc2b48e024bac539f303a020abb68f34a8f4ab57cd8b68edf258cc70e366d)
- [Deposit Transaction Example](https://sepolia.basescan.org/tx/0xaafea377f2f8cddc4778fc9305aaca0489aab5360aa2b29db60646e4374b73cc)
- Builders V4 Registry: `0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381` (Base Sepolia)

## Conclusion

Migrating to Builders V4 provides a production-ready, audited staking infrastructure that aligns with Morpheus Deploy's needs for managing infrastructure staking. The subnet-based architecture allows for isolated staking pools while leveraging a proven, battle-tested system already deployed on Base.
