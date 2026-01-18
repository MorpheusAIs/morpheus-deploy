import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { loadConfig } from '../lib/config.js';
import { WalletManager } from '../lib/wallet.js';
import { DeploymentManager } from '../lib/deployment.js';
import { SDLSynthesizer } from '@morpheus-deploy/core';
import { BuildEngine } from '@morpheus-deploy/core';
import { EconomicEngine } from '@morpheus-deploy/core';
import { parseDuration, formatDuration } from '@morpheus-deploy/core';

const DEFAULT_DURATION = '1y';

interface DeployOptions {
  template?: string;
  gpu?: string;
  repo?: string;
  testnet?: boolean;
  yes?: boolean;
  duration?: string;
}

export async function deployCommand(options: DeployOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n  Morpheus Deploy\n'));

  // Check for morpheus.yaml
  if (!existsSync('morpheus.yaml') && !options.repo) {
    console.log(chalk.red('  Error: morpheus.yaml not found'));
    console.log(chalk.dim(`  Run ${chalk.cyan('morpheus init')} to create a new project\n`));
    process.exit(1);
  }

  const spinner = ora();

  try {
    // Load configuration
    spinner.start('Loading configuration...');
    const config = await loadConfig('morpheus.yaml');
    spinner.succeed(`Project: ${chalk.cyan(config.project)}`);

    // Load wallet
    spinner.start('Connecting to wallet...');
    const walletManager = new WalletManager();
    const wallet = await walletManager.load();
    spinner.succeed(`Wallet: ${chalk.cyan(wallet.address)}`);

    // Check wallet balance
    spinner.start('Checking wallet balance...');
    const balance = await walletManager.getBalance();

    if (balance.usdc < 10) {
      spinner.warn(chalk.yellow(`Low balance: $${balance.usdc} USDC`));
      console.log(chalk.dim('  Fund your wallet to continue with deployment\n'));

      if (!options.yes) {
        const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Continue anyway?',
            default: false,
          },
        ]);
        if (!proceed) return;
      }
    } else {
      spinner.succeed(`Balance: $${balance.usdc} USDC`);
    }

    // Build container image
    spinner.start('Building container image...');
    const buildEngine = new BuildEngine(config);
    const image = await buildEngine.build({
      context: process.cwd(),
      template: options.template || config.template,
    });
    spinner.succeed(`Image built: ${chalk.dim(image.tag)}`);

    // Synthesize SDL
    spinner.start('Synthesizing Akash SDL manifest...');
    const sdlSynthesizer = new SDLSynthesizer(config);
    const sdl = await sdlSynthesizer.synthesize({
      image,
      gpu: options.gpu || config.resources?.gpu?.model,
      testnet: options.testnet,
    });
    spinner.succeed('SDL manifest generated');

    const durationStr = options.duration || config.funding?.duration || DEFAULT_DURATION;
    const durationHours = parseDuration(durationStr);
    const totalUpfrontCost = sdl.estimatedCost * durationHours;

    // Display deployment summary
    console.log(chalk.dim('\n  Deployment Summary:'));
    console.log(chalk.dim(`  - Template: ${config.template}`));
    console.log(
      chalk.dim(
        `  - Resources: ${config.resources?.cpu || 2} CPU, ${config.resources?.memory || '4Gi'} RAM`
      )
    );
    if (sdl.gpu) {
      console.log(chalk.dim(`  - GPU: ${sdl.gpu.model} x${sdl.gpu.units}`));
    }
    console.log(chalk.dim(`  - Network: ${options.testnet ? 'Sandbox (Testnet)' : 'Mainnet'}`));
    console.log(chalk.dim(`  - Estimated cost: ~$${sdl.estimatedCost}/hour`));
    console.log(chalk.dim(`  - Duration: ${formatDuration(durationHours)}`));
    console.log(
      chalk.bold.yellow(`  - Total Upfront Funding: ~$${totalUpfrontCost.toFixed(2)} USDC\n`)
    );

    // Confirm deployment
    if (!options.yes) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Deploy to Akash Network?',
          default: true,
        },
      ]);
      if (!confirm) {
        console.log(chalk.yellow('\n  Deployment cancelled.\n'));
        return;
      }
    }

    spinner.start('Executing cross-chain swap (USDC -> AKT)...');
    const economicEngine = new EconomicEngine(config, walletManager);
    const swapResult = await economicEngine.executeSwap({
      sourceToken: config.funding?.sourceToken || 'USDC',
      amount: totalUpfrontCost,
      destination: 'akash',
    });
    spinner.succeed(
      `Swapped: ${swapResult.sourceAmount} USDC -> ${swapResult.destinationAmount} AKT`
    );

    // Deploy to Akash
    spinner.start('Broadcasting deployment to Akash...');
    const deploymentManager = new DeploymentManager(config, walletManager);
    const deployment = await deploymentManager.create(sdl);
    spinner.succeed(`Deployment created: DSEQ ${chalk.cyan(deployment.dseq)}`);

    // Wait for bids
    spinner.start('Waiting for provider bids...');
    const bids = await deploymentManager.waitForBids(deployment.dseq);
    spinner.succeed(`Received ${bids.length} bids`);

    // Select best bid
    spinner.start('Selecting provider...');
    const selectedBid = await deploymentManager.selectBestBid(bids);
    spinner.succeed(`Selected: ${chalk.cyan(selectedBid.provider)}`);

    // Create lease
    spinner.start('Creating lease...');
    const lease = await deploymentManager.createLease(deployment.dseq, selectedBid);
    spinner.succeed('Lease created');

    // Send manifest
    spinner.start('Sending manifest to provider...');
    await deploymentManager.sendManifest(lease, sdl);
    spinner.succeed('Manifest deployed');

    // Get service URL
    spinner.start('Waiting for service to come online...');
    const serviceUrl = await deploymentManager.waitForService(lease);
    spinner.succeed('Service online');

    // Print success
    console.log(chalk.green.bold('\n  Deployment successful!\n'));
    console.log(`  ${chalk.bold('URL:')}         ${chalk.cyan(serviceUrl)}`);
    console.log(`  ${chalk.bold('DSEQ:')}        ${deployment.dseq}`);
    console.log(`  ${chalk.bold('Provider:')}    ${selectedBid.provider}`);
    console.log(`  ${chalk.bold('Lease ID:')}    ${lease.id}`);
    console.log();
    console.log(chalk.dim(`  View logs:   ${chalk.cyan(`morpheus logs -d ${deployment.dseq}`)}`));
    console.log(
      chalk.dim(`  Check status: ${chalk.cyan(`morpheus status -d ${deployment.dseq}`)}\n`)
    );

    // Save deployment state
    await deploymentManager.saveState(deployment, lease, serviceUrl);
  } catch (error) {
    spinner.fail('Deployment failed');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
