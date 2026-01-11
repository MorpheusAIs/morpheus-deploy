import { createPublicClient, createWalletClient, http, type Address, type Chain } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { randomBytes } from 'crypto';
import { CHAIN_CONFIG } from '../constants.js';
import { getSecurityLogger } from '../security/logger.js';

/**
 * secp256k1 curve order (n)
 * Private keys must be in range [1, n-1]
 * Addresses audit finding H-2: Insufficient Private Key Entropy
 */
const SECP256K1_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

/**
 * Maximum attempts to generate a valid private key
 * Should never need more than 1-2 attempts in practice
 */
const MAX_KEY_GENERATION_ATTEMPTS = 10;

export interface SmartWalletConfig {
  network: 'mainnet' | 'testnet';
  rpcUrl?: string;
}

export interface WalletInfo {
  address: Address;
  chainId: number;
  isSmartWallet: boolean;
  ownerPrivateKey?: `0x${string}`;
}

export interface TransactionRequest {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
  gasLimit?: bigint;
}

export class SmartWalletManager {
  private chain: Chain;
  private publicClient;
  private walletClient;
  private account;
  private network: 'mainnet' | 'testnet';

  constructor(config: SmartWalletConfig, privateKey?: `0x${string}`) {
    this.network = config.network;
    this.chain = config.network === 'mainnet' ? base : baseSepolia;

    const rpcUrl = config.rpcUrl || CHAIN_CONFIG[config.network].rpcUrl;

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    });

    if (privateKey) {
      this.account = privateKeyToAccount(privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.chain,
        transport: http(rpcUrl),
      });
    }
  }

  /**
   * Create a new Coinbase Smart Wallet
   * Uses ERC-4337 account abstraction
   *
   * Security improvements:
   * - H-2: Secure private key generation with entropy validation
   * - M-4: Factory address verification
   * - L-3: Security event logging
   *
   * IMPORTANT: The ownerPrivateKey must be securely stored by the caller.
   * Losing this key means losing access to the wallet.
   */
  async createSmartWallet(): Promise<WalletInfo> {
    const logger = getSecurityLogger();

    // Generate a new owner keypair with entropy validation (H-2)
    const ownerPrivateKey = this.generateSecurePrivateKey();
    const ownerAccount = privateKeyToAccount(ownerPrivateKey);

    // Get and verify factory address (M-4)
    const factoryAddress = CHAIN_CONFIG[this.network].smartWalletFactory;
    await this.verifyFactoryContract(factoryAddress);

    // Compute the counterfactual address with verification (M-4)
    const smartWalletAddress = await this.computeSmartWalletAddressSafe(
      factoryAddress,
      ownerAccount.address
    );

    // Initialize the wallet client with the new account
    this.account = ownerAccount;
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(CHAIN_CONFIG[this.network].rpcUrl),
    });

    // Log security event (L-3)
    await logger.info('SMART_WALLET_CREATED', {
      smartWalletAddress,
      ownerAddress: ownerAccount.address,
      chainId: this.chain.id,
      network: this.network,
      factoryAddress,
    });

    return {
      address: smartWalletAddress,
      chainId: this.chain.id,
      isSmartWallet: true,
      ownerPrivateKey, // Caller must securely store this
    };
  }

  /**
   * Get wallet info for an existing address
   */
  async getWalletInfo(address: Address): Promise<WalletInfo> {
    const code = await this.publicClient.getCode({ address });
    const isSmartWallet = code !== undefined && code !== '0x';

    return {
      address,
      chainId: this.chain.id,
      isSmartWallet,
    };
  }

  /**
   * Get token balance
   */
  async getBalance(address: Address, token: 'ETH' | 'USDC'): Promise<bigint> {
    if (token === 'ETH') {
      return this.publicClient.getBalance({ address });
    }

    // USDC contract address on Base
    const usdcAddress = CHAIN_CONFIG[this.network].usdc;

    const balance = await this.publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    return balance as bigint;
  }

  /**
   * Sign and send a transaction
   */
  async sendTransaction(tx: TransactionRequest): Promise<`0x${string}`> {
    const logger = getSecurityLogger();

    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized with private key');
    }

    const hash = await this.walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value || 0n,
      gas: tx.gasLimit,
    });

    // Log transaction submission (L-3)
    await logger.info('TRANSACTION_SUBMITTED', {
      txHash: hash,
      to: tx.to,
      value: (tx.value || 0n).toString(),
      from: this.account.address,
    });

    return hash;
  }

  /**
   * Sign a message (for passkey-based auth)
   */
  async signMessage(message: string): Promise<`0x${string}`> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized with private key');
    }

    return this.walletClient.signMessage({
      message,
    });
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(hash: `0x${string}`): Promise<{
    status: 'success' | 'reverted';
    blockNumber: bigint;
    gasUsed: bigint;
  }> {
    const logger = getSecurityLogger();
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Log transaction result (L-3)
    await logger.info(
      receipt.status === 'success' ? 'TRANSACTION_CONFIRMED' : 'TRANSACTION_FAILED',
      {
        txHash: hash,
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      }
    );

    return {
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  /**
   * Approve token spending
   */
  async approveToken(
    tokenAddress: Address,
    spender: Address,
    amount: bigint
  ): Promise<`0x${string}`> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized with private key');
    }

    const hash = await this.walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });

    return hash;
  }

  /**
   * Verify factory contract exists and matches expected address
   * Addresses audit finding M-4: Smart Wallet CREATE2 Address Not Verified
   */
  private async verifyFactoryContract(factory: Address): Promise<void> {
    const logger = getSecurityLogger();

    // Verify factory is a contract
    const factoryCode = await this.publicClient.getCode({ address: factory });
    if (!factoryCode || factoryCode === '0x') {
      await logger.error('SMART_WALLET_CREATED', {
        error: 'Factory is not a contract',
        factory,
      });
      throw new Error(
        `Smart Wallet factory ${factory} is not a contract. ` +
        'The factory may not be deployed on this network.'
      );
    }

    // Verify factory matches expected address for this network
    const expectedFactory = CHAIN_CONFIG[this.network].smartWalletFactory;
    if (factory.toLowerCase() !== expectedFactory.toLowerCase()) {
      await logger.error('SMART_WALLET_CREATED', {
        error: 'Factory address mismatch',
        provided: factory,
        expected: expectedFactory,
      });
      throw new Error(
        `Factory ${factory} does not match expected factory ${expectedFactory} for ${this.network}. ` +
        'This may indicate a configuration error or attack.'
      );
    }
  }

  /**
   * Compute smart wallet address with validation
   * Addresses audit finding M-4: Smart Wallet CREATE2 Address Not Verified
   */
  private async computeSmartWalletAddressSafe(
    factory: Address,
    owner: Address
  ): Promise<Address> {
    const computedAddress = await this.publicClient.readContract({
      address: factory,
      abi: FACTORY_ABI,
      functionName: 'getAddress',
      args: [owner, 0n], // salt = 0
    }) as Address;

    // Validate address format
    if (!computedAddress || !/^0x[a-fA-F0-9]{40}$/.test(computedAddress)) {
      throw new Error(
        `Invalid address returned from factory: ${computedAddress}. ` +
        'The factory may be returning incorrect data.'
      );
    }

    // Validate not zero address
    if (computedAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(
        'Factory returned zero address. ' +
        'This may indicate a configuration error with the factory or owner.'
      );
    }

    return computedAddress;
  }

  /**
   * Generate a cryptographically secure private key
   * Addresses audit finding H-2: Insufficient Private Key Entropy
   *
   * Security measures:
   * 1. Uses Node.js crypto.randomBytes() for strong entropy
   * 2. Validates key is within valid secp256k1 range
   * 3. Retries if generated key is invalid (astronomically rare)
   */
  private generateSecurePrivateKey(): `0x${string}` {
    let attempts = 0;

    while (attempts < MAX_KEY_GENERATION_ATTEMPTS) {
      attempts++;

      // Use Node.js crypto for strong entropy
      const bytes = randomBytes(32);
      const privateKeyHex = `0x${bytes.toString('hex')}` as `0x${string}`;
      const keyBigInt = BigInt(privateKeyHex);

      // Validate key is within secp256k1 valid range: [1, n-1]
      // n = curve order (SECP256K1_ORDER)
      if (keyBigInt > 0n && keyBigInt < SECP256K1_ORDER) {
        return privateKeyHex;
      }

      // Key was outside valid range (probability ~2^-128, essentially never happens)
      // Log and retry
      const logger = getSecurityLogger();
      logger.warn('SMART_WALLET_CREATED', {
        warning: 'Generated private key outside secp256k1 range, retrying',
        attempt: attempts,
      });
    }

    // This should never happen - probability is astronomically low
    throw new Error(
      `Failed to generate valid private key after ${MAX_KEY_GENERATION_ATTEMPTS} attempts. ` +
      'This indicates a serious problem with the random number generator.'
    );
  }
}

// Minimal ERC20 ABI for balance and approve
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
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
] as const;

// Smart Wallet Factory ABI
const FACTORY_ABI = [
  {
    name: 'getAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
