import { SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { AuthZMessages } from './messages.js';

export interface AuthZPermission {
  msgType: string;
  spendLimit?: {
    denom: string;
    amount: string;
  };
}

export interface AuthZGrant {
  granter: string;
  grantee: string;
  permissions: AuthZPermission[];
  expiration: Date;
  txHash?: string;
}

export interface GrantOptions {
  granter: string;
  grantee: string;
  permissions: AuthZPermission[];
  expirationDays?: number;
}

export class AuthZManager {
  private rpcEndpoint: string;
  private client: SigningStargateClient | null = null;

  // Standard Morpheus deployment permissions
  static readonly DEPLOYMENT_PERMISSIONS: AuthZPermission[] = [
    { msgType: '/akash.deployment.v1beta3.MsgCreateDeployment' },
    { msgType: '/akash.deployment.v1beta3.MsgUpdateDeployment' },
    { msgType: '/akash.deployment.v1beta3.MsgCloseDeployment' },
    { msgType: '/akash.deployment.v1beta3.MsgDepositDeployment' },
    { msgType: '/akash.market.v1beta4.MsgCreateLease' },
  ];

  // Spend limit for automatic top-ups (Gas Station)
  static readonly GAS_STATION_SPEND_LIMIT: AuthZPermission = {
    msgType: '/cosmos.bank.v1beta1.MsgSend',
    spendLimit: {
      denom: 'uakt',
      amount: '100000000', // 100 AKT max per top-up
    },
  };

  constructor(rpcEndpoint: string = 'https://rpc.akashnet.net:443') {
    this.rpcEndpoint = rpcEndpoint;
  }

  /**
   * Connect to Akash network with a wallet
   */
  async connect(mnemonic: string): Promise<void> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'akash',
    });

    this.client = await SigningStargateClient.connectWithSigner(
      this.rpcEndpoint,
      wallet
    );
  }

  /**
   * Create an AuthZ grant for ephemeral key
   */
  async createGrant(options: GrantOptions): Promise<AuthZGrant> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + (options.expirationDays || 7));

    const messages = options.permissions.map(permission =>
      AuthZMessages.createGrantMsg({
        granter: options.granter,
        grantee: options.grantee,
        msgType: permission.msgType,
        spendLimit: permission.spendLimit,
        expiration,
      })
    );

    // Sign and broadcast
    const result = await this.client.signAndBroadcast(
      options.granter,
      messages,
      'auto',
      'Morpheus AuthZ Grant'
    );

    if (result.code !== 0) {
      throw new Error(`AuthZ grant failed: ${result.rawLog}`);
    }

    return {
      granter: options.granter,
      grantee: options.grantee,
      permissions: options.permissions,
      expiration,
      txHash: result.transactionHash,
    };
  }

  /**
   * Create standard deployment grant for Morpheus
   */
  async createDeploymentGrant(
    granter: string,
    grantee: string,
    enableGasStation: boolean = true
  ): Promise<AuthZGrant> {
    const permissions = [...AuthZManager.DEPLOYMENT_PERMISSIONS];

    if (enableGasStation) {
      permissions.push(AuthZManager.GAS_STATION_SPEND_LIMIT);
    }

    return this.createGrant({
      granter,
      grantee,
      permissions,
      expirationDays: 30, // 30 days for deployment grants
    });
  }

  /**
   * Revoke an existing grant
   */
  async revokeGrant(
    granter: string,
    grantee: string,
    msgType: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const message = AuthZMessages.createRevokeMsg({
      granter,
      grantee,
      msgType,
    });

    const result = await this.client.signAndBroadcast(
      granter,
      [message],
      'auto',
      'Morpheus AuthZ Revoke'
    );

    if (result.code !== 0) {
      throw new Error(`AuthZ revoke failed: ${result.rawLog}`);
    }

    return result.transactionHash;
  }

  /**
   * Query existing grants for an address
   */
  async queryGrants(grantee: string): Promise<AuthZGrant[]> {
    const response = await fetch(
      `${this.rpcEndpoint.replace('rpc', 'api')}/cosmos/authz/v1beta1/grants/grantee/${grantee}`
    );

    if (!response.ok) {
      throw new Error(`Failed to query grants: ${response.statusText}`);
    }

    const data = await response.json() as {
      grants: Array<{
        granter: string;
        grantee: string;
        authorization: {
          '@type': string;
          msg: string;
          spend_limit?: Array<{ denom: string; amount: string }>;
        };
        expiration: string;
      }>;
    };

    return data.grants.map(grant => ({
      granter: grant.granter,
      grantee: grant.grantee,
      permissions: [{
        msgType: grant.authorization.msg || grant.authorization['@type'],
        spendLimit: grant.authorization.spend_limit?.[0],
      }],
      expiration: new Date(grant.expiration),
    }));
  }

  /**
   * Check if a specific grant exists and is valid
   */
  async hasValidGrant(
    granter: string,
    grantee: string,
    msgType: string
  ): Promise<boolean> {
    try {
      const grants = await this.queryGrants(grantee);

      return grants.some(
        grant =>
          grant.granter === granter &&
          grant.permissions.some(p => p.msgType === msgType) &&
          grant.expiration > new Date()
      );
    } catch {
      return false;
    }
  }

  /**
   * Execute a message using an AuthZ grant
   */
  async executeWithGrant(
    grantee: string,
    granter: string,
    messages: unknown[]
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const execMessage = AuthZMessages.createExecMsg({
      grantee,
      msgs: messages,
    });

    const result = await this.client.signAndBroadcast(
      grantee,
      [execMessage],
      'auto',
      `Morpheus AuthZ Exec on behalf of ${granter}`
    );

    if (result.code !== 0) {
      throw new Error(`AuthZ exec failed: ${result.rawLog}`);
    }

    return result.transactionHash;
  }
}
