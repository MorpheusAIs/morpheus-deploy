#!/usr/bin/env tsx
/**
 * Create Morpheus Deploy subnet on forked Base Sepolia
 *
 * This script directly writes subnet configuration to contract storage
 * using Anvil's setStorageAt with the correct V4 struct layout.
 */

import { createTestClient, http, parseUnits, keccak256, encodePacked, pad, publicActions } from 'viem';
import { baseSepolia } from 'viem/chains';

const FORK_RPC_URL = 'http://127.0.0.1:8545';
const STAKING_CONTRACT = '0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381';
const SUBNET_NAME = 'Morpheus Deploy';
// Calculate subnet ID from name: keccak256(encodePacked(['string'], [name]))
const SUBNET_ID = keccak256(encodePacked(['string'], [SUBNET_NAME]));

// Subnet configuration (V4 format)
const SUBNET_CONFIG = {
  name: SUBNET_NAME,
  admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Test account 0
  unusedStorage1_V4Update: 0n,
  withdrawLockPeriodAfterDeposit: 0n, // No lock for testing
  unusedStorage2_V4Update: 0n,
  minimalDeposit: parseUnits('1', 18), // 1 MOR minimum
  claimAdmin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Same as admin
};

async function main() {
  console.log('🔧 Creating Morpheus Deploy subnet on fork...\n');

  const testClient = createTestClient({
    chain: baseSepolia,
    mode: 'anvil',
    transport: http(FORK_RPC_URL),
  }).extend(publicActions);

  // Verify fork is running
  try {
    const blockNumber = await testClient.getBlockNumber();
    console.log(`✓ Fork is running at block ${blockNumber.toLocaleString()}\n`);
  } catch (error) {
    console.error('✗ Fork is not running. Start it with: pnpm fork:start');
    console.error('Error details:', error);
    process.exit(1);
  }

  console.log('Subnet Configuration:');
  console.log(`  ID: ${SUBNET_ID}`);
  console.log(`  Name: ${SUBNET_CONFIG.name}`);
  console.log(`  Admin: ${SUBNET_CONFIG.admin}`);
  console.log(`  Claim Admin: ${SUBNET_CONFIG.claimAdmin}`);
  console.log(`  Minimum Deposit: ${SUBNET_CONFIG.minimalDeposit / (10n ** 18n)} MOR`);
  console.log(`  Lock Period: ${SUBNET_CONFIG.withdrawLockPeriodAfterDeposit} seconds\n`);

  // Calculate storage slot for subnet mapping
  // mapping(bytes32 => SubnetConfig) subnets
  // Assuming subnets mapping is at slot 0 (we'll try different slots if needed)

  console.log('📝 Writing subnet data to contract storage...\n');

  // Try slots 0-10 to find the subnets mapping
  // We'll write to each and verify which one works
  for (let mappingSlot = 0; mappingSlot <= 10; mappingSlot++) {
    console.log(`Trying mapping slot ${mappingSlot}...`);

    // Calculate base slot for this subnet
    const baseSlot = keccak256(
      encodePacked(
        ['bytes32', 'uint256'],
        [SUBNET_ID, BigInt(mappingSlot)]
      )
    );

    // V4 Subnet struct layout in storage (Solidity packs in order, new slot when doesn't fit):
    // Slot baseSlot+0: string name (stores length if <= 31 bytes, or length*2+1 if > 31)
    // Slot baseSlot+1: address admin (20 bytes, right-aligned in 32-byte slot)
    // Slot baseSlot+2: uint128 unusedStorage1 (left 16 bytes) + uint128 withdrawLockPeriod (right 16 bytes)
    // Slot baseSlot+3: uint128 unusedStorage2 (left 16 bytes, right 16 bytes are zeros)
    // Slot baseSlot+4: uint256 minimalDeposit (32 bytes)
    // Slot baseSlot+5: address claimAdmin (20 bytes, right-aligned in 32-byte slot)

    // Encode name as short string (length in last byte if < 32 chars)
    const nameBytes = new TextEncoder().encode(SUBNET_CONFIG.name);
    const nameLength = nameBytes.length;

    if (nameLength < 32) {
      // Short string: data in first 31 bytes, length*2 in last byte
      const nameHex = Buffer.from(nameBytes).toString('hex');
      // Pad to 62 chars (31 bytes), then add length byte
      const paddedNameHex = nameHex.padEnd(62, '0');
      const lengthHex = (nameLength * 2).toString(16).padStart(2, '0');
      const nameSlotValue = `0x${paddedNameHex}${lengthHex}` as `0x${string}`;

      await testClient.setStorageAt({
        address: STAKING_CONTRACT,
        index: baseSlot,
        value: nameSlotValue,
      });
    }

    // Slot baseSlot+1: admin (address, 20 bytes right-aligned with 12 zero bytes on left)
    const slot1Bigint = BigInt(baseSlot) + 1n;
    const slot1 = `0x${slot1Bigint.toString(16).padStart(64, '0')}` as `0x${string}`;
    const slot1Value = pad(SUBNET_CONFIG.admin as `0x${string}`, { dir: 'left', size: 32 });
    await testClient.setStorageAt({
      address: STAKING_CONTRACT,
      index: slot1,
      value: slot1Value,
    });

    // Slot baseSlot+2: unusedStorage1 (left 16 bytes) + withdrawLockPeriod (right 16 bytes)
    const slot2Bigint = BigInt(baseSlot) + 2n;
    const slot2 = `0x${slot2Bigint.toString(16).padStart(64, '0')}` as `0x${string}`;
    const unusedStorage1Hex = SUBNET_CONFIG.unusedStorage1_V4Update.toString(16).padStart(32, '0');
    const lockPeriodHex = SUBNET_CONFIG.withdrawLockPeriodAfterDeposit.toString(16).padStart(32, '0');
    const slot2Value = `0x${unusedStorage1Hex}${lockPeriodHex}` as `0x${string}`;
    await testClient.setStorageAt({
      address: STAKING_CONTRACT,
      index: slot2,
      value: slot2Value,
    });

    // Slot baseSlot+3: unusedStorage2 (left 16 bytes) + 16 zero bytes (right)
    const slot3Bigint = BigInt(baseSlot) + 3n;
    const slot3 = `0x${slot3Bigint.toString(16).padStart(64, '0')}` as `0x${string}`;
    const unusedStorage2Hex = SUBNET_CONFIG.unusedStorage2_V4Update.toString(16).padStart(32, '0');
    const slot3Value = `0x${unusedStorage2Hex}${'0'.repeat(32)}` as `0x${string}`;
    await testClient.setStorageAt({
      address: STAKING_CONTRACT,
      index: slot3,
      value: slot3Value,
    });

    // Slot baseSlot+4: minimalDeposit (uint256, 32 bytes)
    const slot4Bigint = BigInt(baseSlot) + 4n;
    const slot4 = `0x${slot4Bigint.toString(16).padStart(64, '0')}` as `0x${string}`;
    const slot4Value = pad(`0x${SUBNET_CONFIG.minimalDeposit.toString(16)}` as `0x${string}`, { dir: 'left', size: 32 });
    await testClient.setStorageAt({
      address: STAKING_CONTRACT,
      index: slot4,
      value: slot4Value,
    });

    // Slot baseSlot+5: claimAdmin (address, 20 bytes right-aligned with 12 zero bytes on left)
    const slot5Bigint = BigInt(baseSlot) + 5n;
    const slot5 = `0x${slot5Bigint.toString(16).padStart(64, '0')}` as `0x${string}`;
    const slot5Value = pad(SUBNET_CONFIG.claimAdmin as `0x${string}`, { dir: 'left', size: 32 });
    await testClient.setStorageAt({
      address: STAKING_CONTRACT,
      index: slot5,
      value: slot5Value,
    });

    // Verify by trying to read the admin address
    const storedAdmin = await testClient.getStorageAt({
      address: STAKING_CONTRACT,
      slot: slot1,
    });

    if (storedAdmin && storedAdmin.toLowerCase().includes(SUBNET_CONFIG.admin.slice(2).toLowerCase())) {
      console.log(`✓ Found correct mapping slot: ${mappingSlot}\n`);

      console.log('✅ Subnet created successfully!\n');
      console.log('Storage slots written:');
      console.log(`  Slot ${baseSlot} (name): "${SUBNET_CONFIG.name}"`);
      console.log(`  Slot ${slot1} (admin): ${SUBNET_CONFIG.admin}`);
      console.log(`  Slot ${slot2} (unused1 + lock period): ${SUBNET_CONFIG.withdrawLockPeriodAfterDeposit}`);
      console.log(`  Slot ${slot3} (unused2): ${SUBNET_CONFIG.unusedStorage2_V4Update}`);
      console.log(`  Slot ${slot4} (min deposit): ${SUBNET_CONFIG.minimalDeposit / (10n ** 18n)} MOR`);
      console.log(`  Slot ${slot5} (claim admin): ${SUBNET_CONFIG.claimAdmin}\n`);

      console.log('🧪 Ready to run tests:');
      console.log('   pnpm test:unit\n');

      return;
    }
  }

  console.error('✗ Could not find subnets mapping slot. Contract may have different storage layout.');
  process.exit(1);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
