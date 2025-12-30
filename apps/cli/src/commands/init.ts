import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { WalletManager } from '../lib/wallet.js';
import { generateMorpheusConfig } from '../lib/config.js';

interface InitOptions {
  template: string;
  skipWallet?: boolean;
}

interface ProjectAnswers {
  projectName: string;
  template: string;
  gpu: boolean;
  gpuModel?: string;
  fundingSource: string;
  autoTopUp: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n  Morpheus - Decentralized AI Deployment\n'));
  console.log(chalk.dim('  The Vercel for Akash\n'));

  // Check if morpheus.yaml already exists
  if (existsSync('morpheus.yaml')) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'morpheus.yaml already exists. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\nInit cancelled.'));
      return;
    }
  }

  // Interactive project setup
  const answers = await inquirer.prompt<ProjectAnswers>([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: process.cwd().split('/').pop(),
      validate: (input: string) => {
        if (!input.trim()) return 'Project name is required';
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Project name must be lowercase alphanumeric with hyphens only';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'template',
      message: 'Select deployment template:',
      default: options.template,
      choices: [
        {
          name: 'AI Agent - Long-running autonomous workflow with durable execution',
          value: 'ai-agent',
        },
        {
          name: 'MCP Server - Model Context Protocol server for secure data pipelines',
          value: 'mcp-server',
        },
        {
          name: 'Website - Decentralized frontend/web application',
          value: 'website',
        },
        {
          name: 'Custom - Advanced configuration with raw SDL support',
          value: 'custom',
        },
      ],
    },
    {
      type: 'confirm',
      name: 'gpu',
      message: 'Enable GPU acceleration?',
      default: (answers: Partial<ProjectAnswers>) => answers.template === 'ai-agent',
    },
    {
      type: 'list',
      name: 'gpuModel',
      message: 'Select GPU model:',
      when: (answers: ProjectAnswers) => answers.gpu,
      choices: [
        { name: 'NVIDIA A100 (80GB) - Recommended for large models', value: 'nvidia-a100' },
        { name: 'NVIDIA H100 (80GB) - Highest performance', value: 'nvidia-h100' },
        { name: 'NVIDIA RTX 4090 (24GB) - Cost effective', value: 'nvidia-rtx4090' },
        { name: 'NVIDIA A10 (24GB) - Budget option', value: 'nvidia-a10' },
      ],
    },
    {
      type: 'list',
      name: 'fundingSource',
      message: 'Select funding token:',
      choices: [
        { name: 'USDC on Base (Recommended)', value: 'USDC' },
        { name: 'ETH on Base', value: 'ETH' },
        { name: 'Project-native token', value: 'custom' },
      ],
    },
    {
      type: 'confirm',
      name: 'autoTopUp',
      message: 'Enable automatic lease funding (Gas Station)?',
      default: true,
    },
  ]);

  const spinner = ora('Initializing project...').start();

  try {
    // Generate morpheus.yaml configuration
    const config = generateMorpheusConfig({
      projectName: answers.projectName,
      template: answers.template,
      gpu: answers.gpu ? { model: answers.gpuModel!, units: 1 } : undefined,
      funding: {
        sourceToken: answers.fundingSource,
        autoTopUp: answers.autoTopUp,
        threshold: 0.1,
        split: { staking: 0.6, compute: 0.4 },
      },
    });

    await writeFile('morpheus.yaml', config);
    spinner.succeed('Created morpheus.yaml');

    // Setup wallet if not skipped
    if (!options.skipWallet) {
      spinner.start('Setting up Coinbase Smart Wallet...');

      const walletManager = new WalletManager();
      const walletExists = await walletManager.exists();

      if (!walletExists) {
        const wallet = await walletManager.create();
        spinner.succeed(`Smart Wallet created: ${chalk.cyan(wallet.address)}`);

        console.log(chalk.dim('\n  Wallet is configured on Base network (Chain ID: 8453)'));
        console.log(chalk.dim('  Fund your wallet with USDC to enable deployments\n'));
      } else {
        const wallet = await walletManager.load();
        spinner.succeed(`Using existing wallet: ${chalk.cyan(wallet.address)}`);
      }
    }

    // Create .morpheus directory for local state
    if (!existsSync('.morpheus')) {
      await mkdir('.morpheus', { recursive: true });
      await writeFile('.morpheus/.gitignore', '*\n!.gitignore\n');
    }

    // Print success message
    console.log(chalk.green('\n  Project initialized successfully!\n'));
    console.log('  Next steps:');
    console.log(chalk.dim('  1. Review and customize morpheus.yaml'));
    console.log(chalk.dim('  2. Add your API keys to environment variables'));
    console.log(chalk.dim(`  3. Run ${chalk.cyan('morpheus deploy')} to deploy\n`));

    // Template-specific instructions
    if (answers.template === 'ai-agent') {
      console.log(chalk.dim('  For AI Agent templates:'));
      console.log(chalk.dim('  - Install Vercel AI SDK: npm install ai @ai-sdk/openai'));
      console.log(chalk.dim('  - Use @workflow/world-postgres for durable execution\n'));
    }

  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
