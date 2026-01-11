#!/usr/bin/env tsx
/**
 * Create a test wallet for E2E testing
 */
import { homedir } from 'os';
import { join } from 'path';

import { WalletManager } from '../apps/cli/src/lib/wallet.js';

async function main() {
  const walletManager = new WalletManager();

  // Check if wallet already exists
  const exists = await walletManager.exists();
  if (exists) {
    console.log('Wallet already exists at:', join(homedir(), '.morpheus/wallet.json'));
    const wallet = await walletManager.load();
    console.log('Address:', wallet.address);
    return wallet;
  }

  // Create new wallet
  console.log('Creating new wallet...');
  const wallet = await walletManager.create();
  console.log('✅ Wallet created!');
  console.log('Address:', wallet.address);
  console.log('Wallet saved to:', join(homedir(), '.morpheus/wallet.json'));

  return wallet;
}

main().catch(console.error);
