
import { AllChannels, DeploymentInfo, TokenConfig } from './types';

// Universal chain IDs
export const universalChainIds = {
  "babylon": "bbn-test-5",
  "xion": "xion-testnet-2",
  "ethereum": "11155111",
  "bob": "60808",
  "corn": "21000001"
};

// Default RPC endpoints
export const DEFAULT_RPCS: Record<string, string> = {
  'ethereum.11155111': 'https://rpc.sepolia.org',
  'babylon.bbn-test-5': 'https://rpc.bbn-test-5.union.network',
  'xion.xion-testnet-2': 'https://rpc.xion-testnet-2.union.network',
  'bob.60808': 'https://rpc.bob-testnet.union.network',
  'corn.21000000': 'https://rpc.corn-testnet.union.network',
  'corn.21000001': 'https://rpc.corn-testnet-1.union.network'
};

// Channels data
export const channels: AllChannels = {
  "babylon.bbn-test-5": {
    "4": {
      "sla": "PT20M",
      "comments": ["xion.xion-testnet-2"]
    },
    "3": {
      "sla": "PT15H",
      "comments": ["corn.21000001"]
    }
  },
  "xion.xion-testnet-2": {
    "3": {
      "sla": "PT20M",
      "comments": ["babylon.bbn-test-5"]
    }
  },
  "corn.21000001": {
    "3": {
      "sla": "PT15H",
      "comments": ["babylon.bbn-test-5"]
    }
  },
  "ethereum.11155111": {
    "0": {
      "sla": "PT15H",
      "comments": ["babylon.bbn-test-5"]
    }
  }
};

// Deployments data
export const deployments: DeploymentInfo[] = [
  {
    "universal_chain_id": "babylon.bbn-test-5",
    "deployments": {
      "app": {
        "ucs03": {
          "address": "bbn1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf",
          "height": 123456,
          "commit": "abcdef1234567890"
        }
      }
    }
  },
  {
    "universal_chain_id": "xion.xion-testnet-2",
    "deployments": {
      "app": {
        "ucs03": {
          "address": "xion1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf",
          "height": 123457,
          "commit": "abcdef1234567891"
        }
      }
    }
  },
  {
    "universal_chain_id": "ethereum.11155111",
    "deployments": {
      "app": {
        "ucs03": {
          "address": "0x5fbe74a283f7954f10aa04c2edf55578811aeb03",
          "height": 123458,
          "commit": "abcdef1234567892"
        }
      }
    }
  },
  {
    "universal_chain_id": "bob.60808",
    "deployments": {
      "app": {
        "ucs03": {
          "address": "0x5fbe74a283f7954f10aa04c2edf55578811aeb04",
          "height": 123459,
          "commit": "abcdef1234567893"
        }
      }
    }
  },
  {
    "universal_chain_id": "corn.21000001",
    "deployments": {
      "app": {
        "ucs03": {
          "address": "corn1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf",
          "height": 123460,
          "commit": "abcdef1234567894"
        }
      }
    }
  }
];

// Token configurations
export const TOKEN_CONFIG: TokenConfig = {
  'babylon.bbn-test-5': [
    { name: 'ubbn', denom: 'ubbn', type: 'native' },
    { name: 'cw20', denom: 'bbn1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf', type: 'cw20' }
  ],
  'xion.xion-testnet-2': [
    { name: 'uxion', denom: 'uxion', type: 'native' },
    { name: 'cw20', denom: 'xion1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf', type: 'cw20' }
  ],
  'corn.21000001': [
    { name: 'ucorn', denom: 'ucorn', type: 'native' },
    { name: 'cw20', denom: 'corn1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf', type: 'cw20' }
  ],
  'ethereum.11155111': [
    { name: 'ETH', address: '0x0000000000000000000000000000000000000000', type: 'native' },
    { name: 'ERC20', address: '0xabcdef1234567890abcdef1234567890abcdef12', type: 'erc20' }
  ],
  'bob.60808': [
    { name: 'ETH', address: '0x0000000000000000000000000000000000000000', type: 'native' },
    { name: 'ERC20', address: '0xabcdef1234567890abcdef1234567890abcdef13', type: 'erc20' }
  ],
  'corn.21000000': [
    { name: 'ETH', address: '0x0000000000000000000000000000000000000000', type: 'native' },
    { name: 'ERC20', address: '0xabcdef1234567890abcdef1234567890abcdef14', type: 'erc20' }
  ]
};

// Contract ABIs
export const UCS03_ABI = [
  {
    type: 'function',
    name: 'sendPacket',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'channelId', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'token', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
];

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view'
  }
];
