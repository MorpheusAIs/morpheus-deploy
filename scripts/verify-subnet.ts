#!/usr/bin/env tsx
/**
 * Verify subnet exists on fork and query its configuration
 */

import { createPublicClient, http, keccak256, encodePacked } from 'viem';
import { baseSepolia } from 'viem/chains';
import { STAKING_ABI } from '../packages/contracts/src/staking/abi.js';

const FORK_RPC_URL = 'http://127.0.0.1:8545';
const STAKING_CONTRACT = '0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381';
const SUBNET_NAME = 'Morpheus Deploy';
const SUBNET_ID = keccak256(encodePacked(['string'], [SUBNET_NAME]));

async function main() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(FORK_RPC_URL),
  });

  console.log('🔍 Verifying subnet configuration...\n');

  try {
    // Try to read subnet using subnets() function
    const subnet = await client.readContract({
      address: STAKING_CONTRACT,
      abi: STAKING_ABI,
      functionName: 'subnets',
      args: [SUBNET_ID],
    });

    console.log('✅ Subnet found!');
    console.log('Configuration:');
    console.log(JSON.stringify(subnet, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));

  } catch (error: any) {
    console.log('❌ Failed to read subnet:');
    console.log(error.message);
  }

  try {
    // Try getSubnetDeposit
    const totalDeposit = await client.readContract({
      address: STAKING_CONTRACT,
      abi: STAKING_ABI,
      functionName: 'getSubnetDeposit',
      args: [SUBNET_ID],
    });

    console.log(`\n✅ Total subnet deposit: ${totalDeposit.toString()} MOR`);
  } catch (error: any) {
    console.log('\n❌ getSubnetDeposit() reverted:');
    console.log(error.shortMessage || error.message);
  }
}

main().catch(console.error);
