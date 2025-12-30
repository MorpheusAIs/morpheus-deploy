import type { EncodeObject } from '@cosmjs/proto-signing';

export class AkashMessages {
  /**
   * Create deployment message
   */
  static createDeployment(params: {
    owner: string;
    dseq: string;
    version: Uint8Array;
    groups: unknown[];
    deposit: { denom: string; amount: string };
  }): EncodeObject {
    return {
      typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
      value: {
        id: {
          owner: params.owner,
          dseq: params.dseq,
        },
        groups: params.groups,
        version: params.version,
        deposit: params.deposit,
        depositor: params.owner,
      },
    };
  }

  /**
   * Update deployment message
   */
  static updateDeployment(params: {
    owner: string;
    dseq: string;
    version: Uint8Array;
    groups: unknown[];
  }): EncodeObject {
    return {
      typeUrl: '/akash.deployment.v1beta3.MsgUpdateDeployment',
      value: {
        id: {
          owner: params.owner,
          dseq: params.dseq,
        },
        groups: params.groups,
        version: params.version,
      },
    };
  }

  /**
   * Close deployment message
   */
  static closeDeployment(params: {
    owner: string;
    dseq: string;
  }): EncodeObject {
    return {
      typeUrl: '/akash.deployment.v1beta3.MsgCloseDeployment',
      value: {
        id: {
          owner: params.owner,
          dseq: params.dseq,
        },
      },
    };
  }

  /**
   * Deposit to deployment escrow
   */
  static deposit(params: {
    owner: string;
    dseq: string;
    amount: { denom: string; amount: string };
  }): EncodeObject {
    return {
      typeUrl: '/akash.deployment.v1beta3.MsgDepositDeployment',
      value: {
        id: {
          owner: params.owner,
          dseq: params.dseq,
        },
        amount: params.amount,
        depositor: params.owner,
      },
    };
  }

  /**
   * Create lease message
   */
  static createLease(params: {
    owner: string;
    dseq: string;
    gseq: number;
    oseq: number;
    provider: string;
  }): EncodeObject {
    return {
      typeUrl: '/akash.market.v1beta4.MsgCreateLease',
      value: {
        bidId: {
          owner: params.owner,
          dseq: params.dseq,
          gseq: params.gseq,
          oseq: params.oseq,
          provider: params.provider,
        },
      },
    };
  }

  /**
   * Withdraw from lease
   */
  static withdrawLease(params: {
    owner: string;
    dseq: string;
    gseq: number;
    oseq: number;
    provider: string;
  }): EncodeObject {
    return {
      typeUrl: '/akash.market.v1beta4.MsgWithdrawLease',
      value: {
        bidId: {
          owner: params.owner,
          dseq: params.dseq,
          gseq: params.gseq,
          oseq: params.oseq,
          provider: params.provider,
        },
      },
    };
  }

  /**
   * Close bid message
   */
  static closeBid(params: {
    owner: string;
    dseq: string;
    gseq: number;
    oseq: number;
    provider: string;
  }): EncodeObject {
    return {
      typeUrl: '/akash.market.v1beta4.MsgCloseBid',
      value: {
        bidId: {
          owner: params.owner,
          dseq: params.dseq,
          gseq: params.gseq,
          oseq: params.oseq,
          provider: params.provider,
        },
      },
    };
  }
}
