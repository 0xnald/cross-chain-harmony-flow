
// Chain and token type definitions
export interface Chain {
  id: string;
  name: string;
  badge: string;
}

export interface Token {
  name: string;
  denom?: string;
  address?: string;
  balance: string;
  type: 'native' | 'cw20' | 'erc20';
}

export interface Channel {
  sla: string;
  comments: string[];
}

export interface ChainChannels {
  [channelId: string]: Channel;
}

export interface AllChannels {
  [chainId: string]: ChainChannels;
}

export interface DeploymentInfo {
  universal_chain_id: string;
  deployments: {
    app: {
      ucs03: {
        address: string;
        height: number;
        commit: string;
      };
    };
  };
}

export interface TransactionLog {
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface TokenConfig {
  [chainId: string]: Array<{
    name: string;
    denom?: string;
    address?: string;
    type: 'native' | 'cw20' | 'erc20';
  }>;
}
