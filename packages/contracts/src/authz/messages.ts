import type { EncodeObject } from '@cosmjs/proto-signing';

export interface GrantMsgParams {
  granter: string;
  grantee: string;
  msgType: string;
  spendLimit?: {
    denom: string;
    amount: string;
  };
  expiration: Date;
}

export interface RevokeMsgParams {
  granter: string;
  grantee: string;
  msgType: string;
}

export interface ExecMsgParams {
  grantee: string;
  msgs: unknown[];
}

export class AuthZMessages {
  /**
   * Create a MsgGrant for generic authorization
   */
  static createGrantMsg(params: GrantMsgParams): EncodeObject {
    const expirationTimestamp = Math.floor(params.expiration.getTime() / 1000);

    // Determine authorization type based on msg type
    let authorization: {
      typeUrl: string;
      value: object;
    };

    if (params.spendLimit) {
      // Send authorization with spend limit
      authorization = {
        typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
        value: {
          msg: params.msgType,
        },
      };
    } else {
      // Generic authorization
      authorization = {
        typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
        value: {
          msg: params.msgType,
        },
      };
    }

    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
      value: {
        granter: params.granter,
        grantee: params.grantee,
        grant: {
          authorization,
          expiration: {
            seconds: expirationTimestamp,
            nanos: 0,
          },
        },
      },
    };
  }

  /**
   * Create a MsgRevoke to remove authorization
   */
  static createRevokeMsg(params: RevokeMsgParams): EncodeObject {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
      value: {
        granter: params.granter,
        grantee: params.grantee,
        msgTypeUrl: params.msgType,
      },
    };
  }

  /**
   * Create a MsgExec to execute messages on behalf of granter
   */
  static createExecMsg(params: ExecMsgParams): EncodeObject {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: {
        grantee: params.grantee,
        msgs: params.msgs,
      },
    };
  }

  /**
   * Create Akash-specific deployment messages
   */
  static createDeploymentMsg(params: {
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
      },
    };
  }

  /**
   * Create deposit message for deployment escrow
   */
  static createDepositMsg(params: {
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
      },
    };
  }

  /**
   * Create lease message
   */
  static createLeaseMsg(params: {
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
   * Create close deployment message
   */
  static createCloseDeploymentMsg(params: {
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
}
