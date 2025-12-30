#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { deployCommand } from './commands/deploy.js';
import { logsCommand } from './commands/logs.js';
import { statusCommand } from './commands/status.js';
import { fundCommand } from './commands/fund.js';

const program = new Command();

program
  .name('morpheus')
  .description('The Vercel for DePin - Deploy AI agents to decentralized infrastructure')
  .version('0.1.0');

// morpheus init - Initialize a new project
program
  .command('init')
  .description('Initialize a new Morpheus project')
  .option('-t, --template <type>', 'Template type: ai-agent, mcp-server, website, custom', 'ai-agent')
  .option('--skip-wallet', 'Skip wallet setup')
  .action(initCommand);

// morpheus deploy - Deploy to Akash
program
  .command('deploy')
  .description('Deploy your application to decentralized infrastructure')
  .option('-t, --template <type>', 'Template type: ai-agent, mcp-server, website, custom')
  .option('--gpu <model>', 'GPU model: a100, h100, rtx4090')
  .option('--repo <url>', 'Deploy from a remote GitHub repository')
  .option('--testnet', 'Deploy to Akash Sandbox/Testnet')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(deployCommand);

// morpheus logs - Stream logs from deployment
program
  .command('logs')
  .description('Stream real-time logs from your deployment')
  .option('-d, --deployment <dseq>', 'Deployment sequence ID')
  .option('-f, --follow', 'Follow log output', true)
  .action(logsCommand);

// morpheus status - Check deployment status
program
  .command('status')
  .description('Check the status of your deployments')
  .option('-d, --deployment <dseq>', 'Deployment sequence ID')
  .option('--all', 'Show all deployments')
  .action(statusCommand);

// morpheus fund - Add funds to deployment
program
  .command('fund')
  .description('Add funds to an existing deployment')
  .option('-d, --deployment <dseq>', 'Deployment sequence ID')
  .option('-a, --amount <usdc>', 'Amount in USDC to add')
  .action(fundCommand);

// Global options
program
  .option('--node <url>', 'Custom RPC endpoint')
  .option('--testnet', 'Use Akash Sandbox/Testnet');

program.parse();
