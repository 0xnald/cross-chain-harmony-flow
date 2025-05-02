import { AllChannels, DeploymentInfo, TokenConfig } from './types';

// Universal chain IDs
export const universalChainIds = {
  "Babylon Testnet": "bbn-test-5",
  "Xion Testnet": "xion-testnet-2",
  "Sepolia Testnet": "11155111",
  "Bob Testnet": "60808",
  "Corn Testnet": "21000001",
  "Corn Testnet 1": "21000000"
};

// Default RPC endpoints
export const DEFAULT_RPCS: Record<string, string> = {
  'Sepolia Testnet': 'https://rpc.sepolia.org',
  'Babylon Testnet': 'https://rpc.bbn-test-5.union.network',
  'Xion Testnet': 'https://rpc.xion-testnet-2.union.network',
  'Bob Testnet': 'https://rpc.bob-testnet.union.network',
  'Corn Testnet': 'https://rpc.corn-testnet.union.network',
  'Corn Testnet 1': 'https://rpc.corn-testnet-1.union.network'
};

// Channels data
export const channels: AllChannels = {
  "Babylon Testnet": {
    "4": {
      "sla": "PT20M",
      "comments": ["Xion Testnet"]
    },
    "3": {
      "sla": "PT15H",
      "comments": ["Corn Testnet"]
    }
  },
  "Xion Testnet": {
    "3": {
      "sla": "PT20M",
      "comments": ["Babylon Testnet"]
    }
  },
  "Corn Testnet": {
    "3": {
      "sla": "PT15H",
      "comments": ["Babylon Testnet"]
    }
  },
  "Sepolia Testnet": {
    "0": {
      "sla": "PT15H",
      "comments": ["Babylon Testnet"]
    }
  }
};

// Deployments data
export const deployments: DeploymentInfo[] = [
  {
    "universal_chain_id": "Babylon Testnet",
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
    "universal_chain_id": "Xion Testnet",
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
    "universal_chain_id": "Sepolia Testnet",
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
    "universal_chain_id": "Bob Testnet",
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
    "universal_chain_id": "Corn Testnet",
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
  'Babylon Testnet': [
    { name: 'ubbn', denom: 'ubbn', type: 'native' },
    { name: 'cw20', denom: 'bbn1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf', type: 'cw20' }
  ],
  'Xion Testnet': [
    { name: 'uxion', denom: 'uxion', type: 'native' },
    { name: 'cw20', denom: 'xion1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf', type: 'cw20' }
  ],
  'Corn Testnet': [
    { name: 'ucorn', denom: 'ucorn', type: 'native' },
    { name: 'cw20', denom: 'corn1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf', type: 'cw20' }
  ],
  'Sepolia Testnet': [
    { name: 'ETH', address: '0x0000000000000000000000000000000000000000', type: 'native' },
    { name: 'ERC20', address: '0xabcdef1234567890abcdef1234567890abcdef12', type: 'erc20' }
  ],
  'Bob Testnet': [
    { name: 'ETH', address: '0x0000000000000000000000000000000000000000', type: 'native' },
    { name: 'ERC20', address: '0xabcdef1234567890abcdef1234567890abcdef13', type: 'erc20' }
  ],
  'Corn Testnet 1': [
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
