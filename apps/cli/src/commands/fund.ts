import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig } from '../lib/config.js';
import { WalletManager } from '../lib/wallet.js';
import { DeploymentManager } from '../lib/deployment.js';
import { EconomicEngine } from '@morpheus-deploy/core';

interface FundOptions {
  deployment?: string;
  amount?: string;
}

export async function fundCommand(options: FundOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n  Morpheus Fund\n'));

  const spinner = ora();

  try {
    // Load configuration
    const config = await loadConfig('morpheus.yaml');

    // Initialize managers
    const walletManager = new WalletManager();
    const deploymentManager = new DeploymentManager(config, walletManager);
    const economicEngine = new EconomicEngine(config, walletManager);

    // Get deployment DSEQ
    let dseq = options.deployment;
    if (!dseq) {
      spinner.start('Loading active deployment...');
      const activeDeployment = await deploymentManager.getActiveDeployment();
      if (!activeDeployment) {
        spinner.fail('No active deployment found');
        console.log(chalk.dim(`  Use ${chalk.cyan('morpheus fund -d <dseq>')} to specify a deployment\n`));
        process.exit(1);
      }
      dseq = activeDeployment.dseq;
      spinner.stop();
    }

    // Get current status
    spinner.start('Fetching deployment status...');
    const status = await deploymentManager.getStatus(dseq);
    if (!status) {
      spinner.fail('Deployment not found');
      process.exit(1);
    }
    spinner.succeed(`Deployment: ${chalk.cyan(dseq)}`);

    // Show current escrow status
    console.log();
    console.log(chalk.bold('  Current Escrow Status:'));
    console.log(`    ${chalk.dim('Balance:')}      ${status.escrowBalance.toFixed(4)} AKT`);
    console.log(`    ${chalk.dim('Time left:')}    ${status.estimatedTimeRemaining}`);
    console.log();

    // Check wallet balance
    spinner.start('Checking wallet balance...');
    const balance = await walletManager.getBalance();
    spinner.succeed(`Wallet balance: $${balance.usdc} USDC`);

    // Determine amount to fund
    let amount = options.amount ? parseFloat(options.amount) : undefined;

    if (!amount) {
      const { fundAmount } = await inquirer.prompt<{ fundAmount: string }>([
        {
          type: 'list',
          name: 'fundAmount',
          message: 'How much would you like to add?',
          choices: [
            { name: '$10 USDC (~1 day)', value: '10' },
            { name: '$50 USDC (~1 week)', value: '50' },
            { name: '$100 USDC (~2 weeks)', value: '100' },
            { name: '$500 USDC (~2 months)', value: '500' },
            { name: 'Custom amount', value: 'custom' },
          ],
        },
      ]);

      if (fundAmount === 'custom') {
        const { customAmount } = await inquirer.prompt<{ customAmount: string }>([
          {
            type: 'input',
            name: 'customAmount',
            message: 'Enter amount in USDC:',
            validate: (input: string) => {
              const num = parseFloat(input);
              if (isNaN(num) || num <= 0) return 'Please enter a valid positive number';
              return true;
            },
          },
        ]);
        amount = parseFloat(customAmount);
      } else {
        amount = parseFloat(fundAmount);
      }
    }

    // Check if user has enough balance
    if (balance.usdc < amount) {
      console.log(chalk.red(`\n  Insufficient balance. You have $${balance.usdc} USDC but requested $${amount}.\n`));
      process.exit(1);
    }

    // Get swap quote
    spinner.start('Getting swap quote...');
    const quote = await economicEngine.getSwapQuote({
      sourceToken: 'USDC',
      amount,
      destination: 'akash',
    });
    spinner.succeed(`Quote: ${amount} USDC -> ${quote.destinationAmount.toFixed(4)} AKT`);

    // Confirm transaction
    console.log();
    console.log(chalk.bold('  Transaction Summary:'));
    console.log(`    ${chalk.dim('Source:')}       ${amount} USDC (Base)`);
    console.log(`    ${chalk.dim('Destination:')}  ${quote.destinationAmount.toFixed(4)} AKT (Akash)`);
    console.log(`    ${chalk.dim('Fee:')}          ~$${quote.estimatedFee.toFixed(2)}`);
    console.log(`    ${chalk.dim('Route:')}        ${quote.route.join(' -> ')}`);
    console.log();

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Execute swap and fund deployment?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\n  Transaction cancelled.\n'));
      return;
    }

    // Execute cross-chain swap
    spinner.start('Executing cross-chain swap...');
    const swapResult = await economicEngine.executeSwap({
      sourceToken: 'USDC',
      amount,
      destination: 'akash',
      dseq, // Target deployment escrow
    });
    spinner.succeed(`Swapped: ${swapResult.sourceAmount} USDC -> ${swapResult.destinationAmount} AKT`);

    // Deposit to escrow
    spinner.start('Depositing to deployment escrow...');
    await deploymentManager.depositToEscrow(dseq, swapResult.destinationAmount);
    spinner.succeed('Funds deposited');

    // Get updated status
    spinner.start('Fetching updated status...');
    const updatedStatus = await deploymentManager.getStatus(dseq);
    spinner.stop();

    // Print success
    console.log(chalk.green.bold('\n  Funding successful!\n'));
    console.log(chalk.bold('  Updated Escrow Status:'));
    console.log(`    ${chalk.dim('Balance:')}      ${updatedStatus!.escrowBalance.toFixed(4)} AKT`);
    console.log(`    ${chalk.dim('Time left:')}    ${updatedStatus!.estimatedTimeRemaining}`);
    console.log();
    console.log(chalk.dim(`  Transaction: ${swapResult.txHash}`));
    console.log();

  } catch (error) {
    spinner.fail('Funding failed');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
