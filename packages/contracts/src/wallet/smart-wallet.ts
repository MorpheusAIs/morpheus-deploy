import { createPublicClient, createWalletClient, http, type Address, type Chain } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAIN_CONFIG } from '../constants.js';

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

  constructor(config: SmartWalletConfig, privateKey?: `0x${string}`) {
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
   * IMPORTANT: The ownerPrivateKey must be securely stored by the caller.
   * Losing this key means losing access to the wallet.
   */
  async createSmartWallet(): Promise<WalletInfo> {
    // Generate a new owner keypair
    const ownerPrivateKey = this.generatePrivateKey();
    const ownerAccount = privateKeyToAccount(ownerPrivateKey);

    // Smart Wallet factory address on Base
    const factoryAddress = CHAIN_CONFIG[this.chain.id === base.id ? 'mainnet' : 'testnet'].smartWalletFactory;

    // Compute the counterfactual address
    const smartWalletAddress = await this.computeSmartWalletAddress(
      factoryAddress,
      ownerAccount.address
    );

    // Initialize the wallet client with the new account
    this.account = ownerAccount;
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(CHAIN_CONFIG[this.chain.id === base.id ? 'mainnet' : 'testnet'].rpcUrl),
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
    const usdcAddress = CHAIN_CONFIG[this.chain.id === base.id ? 'mainnet' : 'testnet'].usdc;

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
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized with private key');
    }

    const hash = await this.walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value || 0n,
      gas: tx.gasLimit,
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
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

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

  private async computeSmartWalletAddress(
    factory: Address,
    owner: Address
  ): Promise<Address> {
    // Compute CREATE2 address for the smart wallet
    const initCodeHash = await this.publicClient.readContract({
      address: factory,
      abi: FACTORY_ABI,
      functionName: 'getAddress',
      args: [owner, 0n], // salt = 0
    });

    return initCodeHash as Address;
  }

  private generatePrivateKey(): `0x${string}` {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
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
