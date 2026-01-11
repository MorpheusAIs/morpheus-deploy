#!/usr/bin/env tsx
/**
 * Properly create Morpheus Deploy subnet using BuilderSubnets.createSubnet()
 *
 * This script calls the actual createSubnet function by impersonating the owner.
 */

import { createTestClient, http, publicActions, walletActions, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

const FORK_RPC_URL = 'http://127.0.0.1:8545';
const STAKING_CONTRACT = '0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381';
const SUBNET_NAME = 'Morpheus Deploy';
// Subnet ID is keccak256(encodePacked(['string'], [SUBNET_NAME]))
const SUBNET_ID = '0xcacd6c5bb3962e67d37cf2bc645deaa3109769abd779d455340c12da4380e71b';

// Extended ABI with createSubnet and owner functions
const BUILDER_SUBNETS_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'isMigrationOver',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'createSubnet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'subnet_',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'minStake', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'feeTreasury', type: 'address' },
          { name: 'startsAt', type: 'uint128' },
          { name: 'withdrawLockPeriodAfterStake', type: 'uint128' },
        ],
      },
      {
        name: 'metadata_',
        type: 'tuple',
        components: [
          { name: 'slug', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'website', type: 'string' },
          { name: 'image', type: 'string' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'subnets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'subnetId_', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'minStake', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'feeTreasury', type: 'address' },
          { name: 'startsAt', type: 'uint128' },
          { name: 'withdrawLockPeriodAfterStake', type: 'uint128' },
        ],
      },
    ],
  },
  {
    name: 'getSubnetDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'subnetId_', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function main() {
  console.log('🚀 Creating Morpheus Deploy subnet properly...\n');

  const testClient = createTestClient({
    chain: baseSepolia,
    mode: 'anvil',
    transport: http(FORK_RPC_URL),
  }).extend(publicActions).extend(walletActions);

  // Verify fork is running
  try {
    const blockNumber = await testClient.getBlockNumber();
    console.log(`✓ Fork is running at block ${blockNumber.toLocaleString()}\n`);
  } catch (error) {
    console.error('✗ Fork is not running. Start it with: pnpm fork:start');
    process.exit(1);
  }

  // Get contract owner
  console.log('📋 Querying contract state...\n');

  const owner = await testClient.readContract({
    address: STAKING_CONTRACT,
    abi: BUILDER_SUBNETS_ABI,
    functionName: 'owner',
  });
  console.log(`  Contract Owner: ${owner}\n`);

  // Prepare subnet configuration
  const currentBlock = await testClient.getBlock();
  const currentTimestamp = Number(currentBlock.timestamp);
  const startsAt = currentTimestamp + 60; // Future timestamp

  const subnetData = {
    name: SUBNET_NAME,
    owner: owner, // Use contract owner as subnet owner for simplicity
    minStake: parseUnits('1', 18), // 1 MOR minimum
    fee: 0n, // No fee for testing
    feeTreasury: owner, // Use owner as fee treasury
    startsAt: BigInt(startsAt),
    withdrawLockPeriodAfterStake: 0n, // No lock for testing
  };

  const metadataData = {
    slug: 'morpheus-deploy',
    description: 'Decentralized deployment platform for Akash Network',
    website: 'https://morpheus-deploy.org',
    image: 'https://morpheus-deploy.org/logo.png',
  };

  console.log('Subnet Configuration:');
  console.log(`  Name: ${subnetData.name}`);
  console.log(`  Owner: ${subnetData.owner}`);
  console.log(`  Min Stake: ${subnetData.minStake / (10n ** 18n)} MOR`);
  console.log(`  Fee: ${subnetData.fee}%`);
  console.log(`  Fee Treasury: ${subnetData.feeTreasury}`);
  console.log(`  Starts At: ${startsAt === 0 ? 'immediate' : new Date(startsAt * 1000).toISOString()}`);
  console.log(`  Lock Period: ${subnetData.withdrawLockPeriodAfterStake} seconds\n`);

  console.log('Metadata:');
  console.log(`  Slug: ${metadataData.slug}`);
  console.log(`  Description: ${metadataData.description}`);
  console.log(`  Website: ${metadataData.website}`);
  console.log(`  Image: ${metadataData.image}\n`);

  // Impersonate owner
  console.log('🔐 Impersonating contract owner...\n');
  await testClient.impersonateAccount({ address: owner });

  // Create subnet
  console.log('📝 Calling createSubnet()...\n');

  try {
    const hash = await testClient.writeContract({
      address: STAKING_CONTRACT,
      abi: BUILDER_SUBNETS_ABI,
      functionName: 'createSubnet',
      args: [subnetData, metadataData],
      account: owner,
    });

    console.log(`✓ Transaction sent: ${hash}`);

    // Wait for transaction
    const receipt = await testClient.waitForTransactionReceipt({ hash });
    console.log(`✓ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`  Status: ${receipt.status}`);

    // Check logs/events
    if (receipt.logs.length > 0) {
      console.log(`  Events emitted: ${receipt.logs.length}`);
      receipt.logs.forEach((log, i) => {
        console.log(`    Event ${i}: topics=${log.topics.length}, data=${log.data.length} bytes`);
      });
    }
    console.log();

    // Verify subnet was created
    console.log('🔍 Verifying subnet creation...\n');

    try {
      const subnet = await testClient.readContract({
        address: STAKING_CONTRACT,
        abi: BUILDER_SUBNETS_ABI,
        functionName: 'subnets',
        args: [SUBNET_ID],
      });

      console.log('✅ Subnet created successfully!');
      console.log('\nSubnet Data:');
      console.log(`  Name: ${subnet.name}`);
      console.log(`  Owner: ${subnet.owner}`);
      console.log(`  Min Stake: ${subnet.minStake / (10n ** 18n)} MOR`);
      console.log(`  Fee: ${subnet.fee}%`);
      console.log(`  Fee Treasury: ${subnet.feeTreasury}`);
      console.log(`  Starts At: ${subnet.startsAt}`);
      console.log(`  Lock Period: ${subnet.withdrawLockPeriodAfterStake} seconds\n`);

      // Verify getSubnetDeposit works
      const totalDeposit = await testClient.readContract({
        address: STAKING_CONTRACT,
        abi: BUILDER_SUBNETS_ABI,
        functionName: 'getSubnetDeposit',
        args: [SUBNET_ID],
      });

      console.log(`✓ Total subnet deposit: ${totalDeposit.toString()} MOR\n`);

      console.log('🧪 Ready to run tests:');
      console.log('   pnpm test:unit\n');

    } catch (verifyError: any) {
      console.warn('⚠️  Subnet query failed (might be version mismatch):');
      console.warn(verifyError.shortMessage || verifyError.message);
      console.log('\nThis might indicate:');
      console.log('1. The contract at this address uses a different struct layout');
      console.log('2. The contract is an older version with different functions');
      console.log('3. The subnet was created but stored differently\n');

      console.log('To verify manually, check transaction receipt above for events.');
      console.log('You can also try querying with the old V4 struct format.\n');
    }

  } catch (error: any) {
    console.error('❌ Failed to create subnet:');
    console.error(error.message);
    if (error.data) {
      console.error('Revert data:', error.data);
    }
    process.exit(1);
  } finally {
    // Stop impersonation
    await testClient.stopImpersonatingAccount({ address: owner });
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
