import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const WALLET_DIR = join(homedir(), '.morpheus');
const WALLET_FILE = join(WALLET_DIR, 'wallet.json');

export interface WalletData {
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  chainId: number;
  createdAt: string;
}

export interface WalletBalance {
  usdc: number;
  eth: number;
  akt: number;
  mor: number;
}

export interface EphemeralKey {
  address: string;
  privateKey: string;
  permissions: string[];
  expiresAt: Date;
}

export class WalletManager {
  private walletData: WalletData | null = null;
  private ephemeralKey: EphemeralKey | null = null;

  async exists(): Promise<boolean> {
    return existsSync(WALLET_FILE);
  }

  async create(): Promise<{ address: string; publicKey: string }> {
    // Generate a new wallet using secure random bytes
    const privateKey = randomBytes(32);
    const { address, publicKey } = this.deriveAddressFromPrivateKey(privateKey);

    // Encrypt the private key
    const password = await this.getOrCreatePassword();
    const { encrypted, salt, iv } = this.encryptPrivateKey(privateKey, password);

    // Store wallet data
    this.walletData = {
      address,
      publicKey,
      encryptedPrivateKey: encrypted,
      salt,
      iv,
      chainId: 8453, // Base network
      createdAt: new Date().toISOString(),
    };

    // Ensure directory exists
    if (!existsSync(WALLET_DIR)) {
      await mkdir(WALLET_DIR, { recursive: true });
    }

    // Save to file
    await writeFile(WALLET_FILE, JSON.stringify(this.walletData, null, 2));

    return { address, publicKey };
  }

  async load(): Promise<{ address: string; publicKey: string }> {
    if (!existsSync(WALLET_FILE)) {
      throw new Error('Wallet not found. Run `morpheus init` to create one.');
    }

    const content = await readFile(WALLET_FILE, 'utf-8');
    this.walletData = JSON.parse(content) as WalletData;

    return {
      address: this.walletData.address,
      publicKey: this.walletData.publicKey,
    };
  }

  async getBalance(): Promise<WalletBalance> {
    if (!this.walletData) {
      await this.load();
    }

    // Query balances from Base network and cross-chain
    // This would use viem/ethers to query actual balances
    // For now, return placeholder implementation

    const balances = await this.queryBalances(this.walletData!.address);

    return balances;
  }

  async signTransaction(tx: unknown): Promise<string> {
    if (!this.walletData) {
      await this.load();
    }

    // Decrypt private key
    const password = await this.getOrCreatePassword();
    const privateKey = this.decryptPrivateKey(
      this.walletData!.encryptedPrivateKey,
      this.walletData!.salt,
      this.walletData!.iv,
      password
    );

    // Sign the transaction
    const signature = this.signWithPrivateKey(privateKey, tx);

    // Clear private key from memory
    privateKey.fill(0);

    return signature;
  }

  async createEphemeralKey(permissions: string[]): Promise<EphemeralKey> {
    // Generate ephemeral key for deployment operations
    const privateKey = randomBytes(32);
    const { address } = this.deriveAddressFromPrivateKey(privateKey);

    this.ephemeralKey = {
      address,
      privateKey: privateKey.toString('hex'),
      permissions,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    // Store ephemeral key locally
    const ephemeralFile = join(WALLET_DIR, 'ephemeral.json');
    await writeFile(ephemeralFile, JSON.stringify({
      address: this.ephemeralKey.address,
      permissions: this.ephemeralKey.permissions,
      expiresAt: this.ephemeralKey.expiresAt.toISOString(),
    }, null, 2));

    return this.ephemeralKey;
  }

  async getEphemeralKey(): Promise<EphemeralKey | null> {
    const ephemeralFile = join(WALLET_DIR, 'ephemeral.json');
    if (!existsSync(ephemeralFile)) {
      return null;
    }

    const content = await readFile(ephemeralFile, 'utf-8');
    const data = JSON.parse(content);

    if (new Date(data.expiresAt) < new Date()) {
      return null; // Expired
    }

    return this.ephemeralKey;
  }

  // Private helper methods

  private deriveAddressFromPrivateKey(_privateKey: Buffer): { address: string; publicKey: string } {
    // This would use secp256k1 to derive the public key and address
    // Placeholder implementation
    const publicKeyHash = randomBytes(20); // Would be keccak256(publicKey)[12:]
    const address = '0x' + publicKeyHash.toString('hex');
    const publicKey = '0x04' + randomBytes(64).toString('hex');

    return { address, publicKey };
  }

  private encryptPrivateKey(
    privateKey: Buffer,
    password: string
  ): { encrypted: string; salt: string; iv: string } {
    const salt = randomBytes(16);
    const iv = randomBytes(16);
    const key = scryptSync(password, salt, 32);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(privateKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted: Buffer.concat([encrypted, authTag]).toString('hex'),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  private decryptPrivateKey(
    encrypted: string,
    salt: string,
    iv: string,
    password: string
  ): Buffer {
    const encryptedBuffer = Buffer.from(encrypted, 'hex');
    const authTag = encryptedBuffer.slice(-16);
    const encryptedData = encryptedBuffer.slice(0, -16);

    const key = scryptSync(password, Buffer.from(salt, 'hex'), 32);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  private signWithPrivateKey(_privateKey: Buffer, _tx: unknown): string {
    // Would use secp256k1 to sign the transaction
    // Placeholder implementation
    return '0x' + randomBytes(65).toString('hex');
  }

  private async getOrCreatePassword(): Promise<string> {
    // In production, this would use keytar or system keychain
    // For now, use a deterministic password based on machine ID
    const machineId = await this.getMachineId();
    return machineId;
  }

  private async getMachineId(): Promise<string> {
    // Get a unique machine identifier
    // This is a simplified version - production would use platform-specific APIs
    const { hostname, platform, arch } = await import('os');
    return `${hostname()}-${platform()}-${arch()}`;
  }

  private async queryBalances(address: string): Promise<WalletBalance> {
    // Would query actual blockchain balances using viem/ethers
    // Placeholder implementation
    console.log(`Querying balances for ${address}`);

    return {
      usdc: 0,
      eth: 0,
      akt: 0,
      mor: 0,
    };
  }
}
