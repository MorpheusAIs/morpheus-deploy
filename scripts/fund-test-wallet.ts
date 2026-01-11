#!/usr/bin/env tsx
/**
 * Fund test wallet on fork with ETH and USDC
 */
import { createPublicClient, http, keccak256 } from 'viem';
import { baseSepolia } from 'viem/chains';

const FORK_RPC_URL = 'http://127.0.0.1:8545';
const WALLET_ADDRESS = '0x5d2a1167e4e5a176cc159d00a73fc31c461dd53a';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// USDC storage slot formula: keccak256(abi.encode(address, slot))
// For most ERC20s, balances are in slot 0, 1, or 2
// Base Sepolia USDC uses slot 9
const BALANCE_SLOT = 9;

async function main() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(FORK_RPC_URL),
  });

  console.log('Funding wallet:', WALLET_ADDRESS);
  console.log('');

  // 1. Set ETH balance for gas
  console.log('1. Setting ETH balance to 10 ETH...');
  await fetch(FORK_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'anvil_setBalance',
      params: [WALLET_ADDRESS, '0x8AC7230489E80000'], // 10 ETH in hex
      id: 1,
    }),
  });

  const ethBalance = await client.getBalance({ address: WALLET_ADDRESS });
  console.log('✅ ETH balance:', (Number(ethBalance) / 1e18).toFixed(4), 'ETH');
  console.log('');

  // 2. Set USDC balance using storage slot manipulation
  console.log('2. Setting USDC balance to 1000 USDC...');

  // Calculate the storage slot for this address's balance
  // slot = keccak256(abi.encode(address, balanceSlot))
  const balanceSlotKey = calculateStorageSlot(WALLET_ADDRESS, BALANCE_SLOT);

  // Set balance to 1000 USDC (6 decimals)
  const usdcAmount = 1000n * 10n ** 6n; // 1000 USDC
  const paddedValue = '0x' + usdcAmount.toString(16).padStart(64, '0');

  await fetch(FORK_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'anvil_setStorageAt',
      params: [USDC_ADDRESS, balanceSlotKey, paddedValue],
      id: 2,
    }),
  });

  // Verify USDC balance
  const usdcBalance = await client.readContract({
    address: USDC_ADDRESS,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: [WALLET_ADDRESS],
  });

  console.log('✅ USDC balance:', (Number(usdcBalance) / 1e6).toFixed(2), 'USDC');
  console.log('');
  console.log('Wallet is funded and ready for deployment!');
}

function calculateStorageSlot(address: string, slot: number): string {
  // Encode address and slot together
  const encoded = address.toLowerCase().replace('0x', '').padStart(64, '0') +
    slot.toString(16).padStart(64, '0');

  // Calculate keccak256
  return keccak256(('0x' + encoded) as `0x${string}`);
}

main().catch(console.error);
