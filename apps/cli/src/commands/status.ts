import ora from 'ora';
import chalk from 'chalk';
import { loadConfig } from '../lib/config.js';
import { WalletManager } from '../lib/wallet.js';
import { DeploymentManager, type Deployment, type DeploymentStatus } from '../lib/deployment.js';

interface StatusOptions {
  deployment?: string;
  all?: boolean;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n  Morpheus Status\n'));

  const spinner = ora();

  try {
    // Load configuration
    const config = await loadConfig('morpheus.yaml');

    // Initialize managers
    const walletManager = new WalletManager();
    const deploymentManager = new DeploymentManager(config, walletManager);

    if (options.all) {
      // List all deployments
      spinner.start('Fetching all deployments...');
      const deployments = await deploymentManager.listDeployments();
      spinner.stop();

      if (deployments.length === 0) {
        console.log(chalk.dim('  No deployments found.\n'));
        return;
      }

      console.log(chalk.bold(`  Found ${deployments.length} deployment(s):\n`));

      for (const deployment of deployments) {
        printDeploymentSummary(deployment);
      }

    } else {
      // Show specific or active deployment
      let dseq = options.deployment;

      if (!dseq) {
        spinner.start('Loading active deployment...');
        const activeDeployment = await deploymentManager.getActiveDeployment();
        if (!activeDeployment) {
          spinner.fail('No active deployment found');
          console.log(chalk.dim(`\n  Use ${chalk.cyan('morpheus status --all')} to list all deployments`));
          console.log(chalk.dim(`  Use ${chalk.cyan('morpheus status -d <dseq>')} for a specific deployment\n`));
          process.exit(1);
        }
        dseq = activeDeployment.dseq;
        spinner.stop();
      }

      spinner.start(`Fetching deployment ${dseq}...`);
      const status = await deploymentManager.getStatus(dseq);
      spinner.stop();

      if (!status) {
        console.log(chalk.red(`  Deployment ${dseq} not found.\n`));
        process.exit(1);
      }

      printDeploymentStatus(status, true);

      // Show escrow warning if low
      if (status.escrowBalance < 10) {
        console.log(chalk.yellow.bold('\n  Warning: Low escrow balance!'));
        console.log(chalk.dim(`  Run ${chalk.cyan(`morpheus fund -d ${dseq}`)} to add funds\n`));
      }
    }

  } catch (error) {
    spinner.fail('Failed to get status');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printDeploymentStatus(status: DeploymentStatus, detailed = false): void {
  // Status indicator
  let stateIcon: string;
  let stateColor: typeof chalk;
  switch (status.state) {
    case 'active':
      stateIcon = '●';
      stateColor = chalk.green;
      break;
    case 'pending':
      stateIcon = '○';
      stateColor = chalk.yellow;
      break;
    case 'closed':
      stateIcon = '○';
      stateColor = chalk.gray;
      break;
    default:
      stateIcon = '?';
      stateColor = chalk.gray;
  }

  console.log(`  ${stateColor(stateIcon)} ${chalk.bold('DSEQ:')} ${status.dseq}`);
  console.log(`    ${chalk.dim('State:')}     ${stateColor(status.state.toUpperCase())}`);
  console.log(`    ${chalk.dim('Provider:')}  ${status.provider}`);

  if (status.url) {
    console.log(`    ${chalk.dim('URL:')}       ${chalk.cyan(status.url)}`);
  }

  if (detailed) {
    console.log();
    console.log(chalk.bold('  Resources:'));
    console.log(`    ${chalk.dim('CPU:')}       ${status.resources.cpu} units`);
    console.log(`    ${chalk.dim('Memory:')}    ${status.resources.memory}`);
    if (status.resources.gpu) {
      console.log(`    ${chalk.dim('GPU:')}       ${status.resources.gpu.model} x${status.resources.gpu.units}`);
    }

    console.log();
    console.log(chalk.bold('  Escrow:'));
    console.log(`    ${chalk.dim('Balance:')}   ${status.escrowBalance.toFixed(4)} AKT`);
    console.log(`    ${chalk.dim('Time left:')} ${status.estimatedTimeRemaining}`);

    console.log();
    console.log(chalk.bold('  Metadata:'));
    console.log(`    ${chalk.dim('Created:')}   ${status.createdAt.toLocaleString()}`);
  } else {
    console.log(`    ${chalk.dim('Escrow:')}    ${status.escrowBalance.toFixed(2)} AKT (${status.estimatedTimeRemaining})`);
  }

  console.log();
}

function printDeploymentSummary(deployment: Deployment): void {
  // Status indicator
  let stateIcon: string;
  let stateColor: typeof chalk;
  switch (deployment.state) {
    case 'active':
      stateIcon = '●';
      stateColor = chalk.green;
      break;
    case 'pending':
      stateIcon = '○';
      stateColor = chalk.yellow;
      break;
    case 'closed':
      stateIcon = '○';
      stateColor = chalk.gray;
      break;
    default:
      stateIcon = '?';
      stateColor = chalk.gray;
  }

  console.log(`  ${stateColor(stateIcon)} ${chalk.bold('DSEQ:')} ${deployment.dseq}`);
  console.log(`    ${chalk.dim('State:')}     ${stateColor(deployment.state.toUpperCase())}`);
  console.log(`    ${chalk.dim('Created:')}   ${deployment.createdAt.toLocaleString()}`);
  console.log();
}
