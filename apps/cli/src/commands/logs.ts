import ora from 'ora';
import chalk from 'chalk';
import WebSocket from 'ws';
import { loadConfig } from '../lib/config.js';
import { WalletManager } from '../lib/wallet.js';
import { DeploymentManager } from '../lib/deployment.js';

interface LogsOptions {
  deployment?: string;
  follow?: boolean;
}

export async function logsCommand(options: LogsOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n  Morpheus Logs\n'));

  const spinner = ora();

  try {
    // Load configuration
    const config = await loadConfig('morpheus.yaml');

    // Initialize managers
    const walletManager = new WalletManager();
    const deploymentManager = new DeploymentManager(config, walletManager);

    // Get deployment DSEQ
    let dseq = options.deployment;
    if (!dseq) {
      spinner.start('Loading active deployment...');
      const activeDeployment = await deploymentManager.getActiveDeployment();
      if (!activeDeployment) {
        spinner.fail('No active deployment found');
        console.log(chalk.dim(`  Use ${chalk.cyan('morpheus logs -d <dseq>')} to specify a deployment\n`));
        process.exit(1);
      }
      dseq = activeDeployment.dseq;
      spinner.succeed(`Deployment: ${chalk.cyan(dseq)}`);
    }

    // Get lease info
    spinner.start('Connecting to provider...');
    const lease = await deploymentManager.getLease(dseq);
    if (!lease) {
      spinner.fail('Lease not found for deployment');
      process.exit(1);
    }
    spinner.succeed(`Provider: ${chalk.dim(lease.provider)}`);

    // Connect to log relay WebSocket
    console.log(chalk.dim('\n  Streaming logs (Ctrl+C to exit)...\n'));
    console.log(chalk.dim('  ─'.repeat(40)));

    const logRelayUrl = await deploymentManager.getLogRelayUrl(lease);

    const ws = new WebSocket(logRelayUrl);

    ws.on('open', () => {
      // Send authentication
      ws.send(JSON.stringify({
        type: 'auth',
        dseq,
        leaseId: lease.id,
      }));
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'log') {
          const timestamp = new Date(message.timestamp).toISOString();
          const service = message.service || 'agent';
          const level = message.level || 'info';

          // Color code by level
          let levelColor = chalk.dim;
          if (level === 'error') levelColor = chalk.red;
          else if (level === 'warn') levelColor = chalk.yellow;
          else if (level === 'debug') levelColor = chalk.gray;

          // Color code by service
          let serviceColor = chalk.cyan;
          if (service === 'postgres') serviceColor = chalk.blue;
          else if (service === 'vector') serviceColor = chalk.magenta;

          console.log(
            chalk.dim(`[${timestamp}]`),
            serviceColor(`[${service}]`),
            levelColor(message.message)
          );
        } else if (message.type === 'error') {
          console.error(chalk.red(`  Error: ${message.message}`));
        }
      } catch {
        // Raw log line
        console.log(chalk.dim('  '), data.toString().trim());
      }
    });

    ws.on('error', (error) => {
      console.error(chalk.red('\n  WebSocket error:'), error.message);
    });

    ws.on('close', () => {
      console.log(chalk.dim('\n  ─'.repeat(40)));
      console.log(chalk.dim('  Connection closed\n'));
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log(chalk.dim('\n\n  Disconnecting...'));
      ws.close();
      process.exit(0);
    });

    // Keep process alive if following
    if (options.follow) {
      await new Promise(() => {}); // Never resolves
    } else {
      // Wait for initial logs then close
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.close();
          resolve();
        }, 5000);
      });
    }

  } catch (error) {
    spinner.fail('Failed to stream logs');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
