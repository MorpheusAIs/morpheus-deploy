import { type Address, parseUnits, formatUnits, keccak256, encodePacked } from 'viem';
import { publicClient, testClient, CONTRACTS } from '../setup/fork.js';

// ERC-20 ABI (minimal)
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Get USDC balance of an address
 */
export async function getUSDCBalance(address: Address): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  }) as Promise<bigint>;
}

/**
 * Get MOR balance of an address
 */
export async function getMORBalance(address: Address): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.mor,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  }) as Promise<bigint>;
}

/**
 * Get USDC allowance
 */
export async function getUSDCAllowance(owner: Address, spender: Address): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  }) as Promise<bigint>;
}

/**
 * Get MOR allowance
 */
export async function getMORAllowance(owner: Address, spender: Address): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.mor,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  }) as Promise<bigint>;
}

/**
 * Mint USDC to an address by manipulating storage (Anvil only)
 * This is a hack to give test accounts USDC without needing a whale
 */
export async function mintUSDC(to: Address, amount: string): Promise<void> {
  const amountWei = parseUnits(amount, 6); // USDC has 6 decimals

  // For USDC on Base Sepolia, we need to find the storage slot for balances
  // This is specific to the FiatTokenProxy implementation
  // Slot 9 is typically the balances mapping

  const balanceSlot = 9n;

  // Calculate storage slot for this address's balance
  // keccak256(abi.encode(address, slot))
  const slot = keccak256(
    encodePacked(
      ['address', 'uint256'],
      [to, balanceSlot]
    )
  );

  // Set the storage directly
  const paddedAmount = amountWei.toString(16).padStart(64, '0');

  await testClient.setStorageAt({
    address: CONTRACTS.usdc,
    index: slot,
    value: `0x${paddedAmount}` as `0x${string}`,
  });

  console.log(`   💰 Minted ${amount} USDC to ${to}`);
}

/**
 * Mint MOR to an address by manipulating storage (Anvil only)
 */
export async function mintMOR(to: Address, amount: string): Promise<void> {
  const amountWei = parseUnits(amount, 18); // MOR has 18 decimals

  // For standard ERC-20, balances are usually in slot 0 or 1
  // MOR contract may vary, but we'll try slot 0
  const balanceSlot = 0n;

  // Calculate storage slot using keccak256(abi.encode(address, slot))
  const slot = keccak256(
    encodePacked(
      ['address', 'uint256'],
      [to, balanceSlot]
    )
  );

  const paddedAmount = amountWei.toString(16).padStart(64, '0');

  await testClient.setStorageAt({
    address: CONTRACTS.mor,
    index: slot,
    value: `0x${paddedAmount}` as `0x${string}`,
  });

  console.log(`   💰 Minted ${amount} MOR to ${to}`);
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, 6);
}

/**
 * Format MOR amount (18 decimals)
 */
export function formatMOR(amount: bigint): string {
  return formatUnits(amount, 18);
}

/**
 * Parse USDC amount (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

/**
 * Parse MOR amount (18 decimals)
 */
export function parseMOR(amount: string): bigint {
  return parseUnits(amount, 18);
}

/**
 * Get token balance for any ERC-20
 */
export async function getTokenBalance(tokenAddress: Address, account: Address): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account],
  }) as Promise<bigint>;
}

/**
 * Approve token spending
 */
export async function approveToken(
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
  walletClient: any
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
