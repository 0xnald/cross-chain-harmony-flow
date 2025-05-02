import { createPublicClient, http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { StargateClient, SigningStargateClient } from '@cosmjs/stargate';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { channels, DEFAULT_RPCS, TOKEN_CONFIG, deployments, UCS03_ABI, ERC20_ABI } from './constants';
import { Token, TransactionLog } from './types';

export const getChainBadgeClass = (chainId: string): string => {
  if (chainId.includes('Babylon')) return 'chain-badge-babylon';
  if (chainId.includes('Xion')) return 'chain-badge-xion';
  if (chainId.includes('Sepolia')) return 'chain-badge-ethereum';
  if (chainId.includes('Bob')) return 'chain-badge-bob';
  if (chainId.includes('Corn')) return 'chain-badge-corn';
  return '';
};

export const getSlaMessage = (sourceChain: string, destChain: string): string => {
  const channelId = Object.keys(channels[sourceChain] || {}).find(id =>
    channels[sourceChain]?.[id]?.comments?.includes(destChain)
  );
  const sla = channels[sourceChain]?.[channelId]?.sla;
  return sla ? `Transfer may take up to ${sla.replace('PT', '').toLowerCase()}` : '';
};

export const getExplorerUrl = (txHash: string, chain: string): string => {
  return `https://app.union.build/explorer/${txHash}`;
};

export const deriveAddress = async (privateKey: string, sourceChain: string): Promise<string> => {
  try {
    if (!privateKey) {
      console.log('deriveAddress: No private key provided');
      return '';
    }
    if (sourceChain.startsWith('Sepolia') || sourceChain.startsWith('Bob') || sourceChain.startsWith('Corn')) {
      const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
      console.log(`deriveAddress: Derived EVM address for ${sourceChain}: ${account.address}`);
      return account.address;
    } else {
      const prefix = sourceChain.includes('Babylon') ? 'bbn' : 
                    sourceChain.includes('Xion') ? 'xion' : 
                    sourceChain.includes('Corn') ? 'corn' : 'cosmos';
      const wallet = await DirectSecp256k1Wallet.fromKey(
        Buffer.from(privateKey.replace(/^0x/, ''), 'hex'),
        prefix
      );
      const address = (await wallet.getAccounts())[0].address;
      console.log(`deriveAddress: Derived Cosmos address for ${sourceChain}: ${address}`);
      return address;
    }
  } catch (error) {
    console.error(`deriveAddress: Error for ${sourceChain}:`, error);
    return `Error: ${(error as Error).message}`;
  }
};

export const fetchTokens = async (
  walletAddress: string,
  sourceChain: string,
  useCustomRpc: boolean,
  customRpc: string
): Promise<Token[]> => {
  console.log('fetchTokens: Starting', { walletAddress, sourceChain, useCustomRpc, customRpc });

  if (!walletAddress || walletAddress.startsWith('Error') || !sourceChain) {
    console.error('fetchTokens: Invalid input', { walletAddress, sourceChain });
    return [];
  }

  const rpcUrl = useCustomRpc && customRpc ? customRpc : DEFAULT_RPCS[sourceChain];
  const tokenList = TOKEN_CONFIG[sourceChain] || [];
  const tokens: Token[] = [];

  if (!rpcUrl) {
    console.error(`fetchTokens: No RPC URL for ${sourceChain}`);
    return [];
  }
  if (!tokenList.length) {
    console.error(`fetchTokens: No tokens configured for ${sourceChain}`);
    return [];
  }

  console.log('fetchTokens: RPC and token config', { rpcUrl, tokenList });

  if (sourceChain.startsWith('Sepolia') || sourceChain.startsWith('Bob') || sourceChain.startsWith('Corn')) {
    try {
      console.log(`fetchTokens: Connecting to EVM RPC for ${sourceChain}`, { rpcUrl });
      const publicClient = createPublicClient({ 
        chain: sepolia, // Note: Using sepolia chain config; adjust for Bob/Corn if needed
        transport: http(rpcUrl) 
      });

      for (const token of tokenList) {
        console.log(`fetchTokens: Processing ${token.name} (${token.type})`, { walletAddress, tokenAddress: token.address });
        let balance;
        if (token.type === 'native') {
          try {
            const formattedAddress = walletAddress.startsWith('0x') ? walletAddress : `0x${walletAddress}`;
            balance = await publicClient.getBalance({ address: formattedAddress as `0x${string}` });
            console.log(`fetchTokens: Native balance for ${token.name}: ${balance.toString()} wei`);
          } catch (nativeError) {
            console.error(`fetchTokens: Error fetching native balance for ${token.name}:`, nativeError);
            balance = '0';
          }
        } else {
          const tokenAddr = token.address?.startsWith('0x') ? token.address : `0x${token.address}`;
          console.log(`fetchTokens: Querying ERC20 contract at ${tokenAddr}`);
          try {
            balance = await publicClient.readContract({
              address: tokenAddr as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [walletAddress.startsWith('0x') ? walletAddress : `0x${walletAddress}` as `0x${string}`]
            });
            console.log(`fetchTokens: ERC20 balance for ${token.name}: ${balance.toString()}`);
          } catch (contractError) {
            console.error(`fetchTokens: Error fetching ERC20 balance for ${token.name} at ${tokenAddr}:`, contractError);
            balance = '0';
          }
        }
        tokens.push({ 
          name: token.name, 
          address: token.address, 
          balance: balance.toString(), 
          type: token.type 
        });
      }
      console.log(`fetchTokens: Completed for ${sourceChain}`, { tokens });
      return tokens;
    } catch (rpcError) {
      console.error(`fetchTokens: RPC error for ${sourceChain}:`, rpcError);
      return [];
    }
  } else {
    try {
      console.log(`fetchTokens: Connecting to Cosmos RPC for ${sourceChain}`, { rpcUrl });
      const stargateClient = await StargateClient.connect(rpcUrl);
      const cosmWasmClient = await CosmWasmClient.connect(rpcUrl);

      for (const token of tokenList) {
        console.log(`fetchTokens: Processing ${token.name} (${token.type})`, { walletAddress, denom: token.denom });
        let balance;
        if (token.type === 'native') {
          try {
            const result = await stargateClient.getBalance(walletAddress, token.denom!);
            balance = result.amount;
            console.log(`fetchTokens: Native balance for ${token.name}: ${balance}`);
          } catch (nativeError) {
            console.error(`fetchTokens: Error fetching native balance for ${token.name}:`, nativeError);
            balance = '0';
          }
        } else {
          try {
            const queryMsg = { balance: { address: walletAddress } };
            const result = await cosmWasmClient.queryContractSmart(token.denom!, queryMsg);
            balance = result.balance;
            console.log(`fetchTokens: CW20 balance for ${token.name}: ${balance}`);
          } catch (cw20Error) {
            console.error(`fetchTokens: Error fetching CW20 balance for ${token.name} at ${token.denom}:`, cw20Error);
            balance = '0';
          }
        }
        tokens.push({ 
          name: token.name, 
          denom: token.denom, 
          balance, 
          type: token.type 
        });
      }
      console.log(`fetchTokens: Completed for ${sourceChain}`, { tokens });
      return tokens;
    } catch (rpcError) {
      console.error(`fetchTokens: RPC error for ${sourceChain} (Cosmos):`, rpcError);
      return [];
    }
  }
};

export const fetchTokenByContract = async (
  walletAddress: string,
  sourceChain: string,
  contractAddress: string,
  useCustomRpc: boolean,
  customRpc: string
): Promise<Token | null> => {
  console.log('fetchTokenByContract: Starting', { walletAddress, sourceChain, contractAddress, useCustomRpc, customRpc });

  if (!walletAddress || walletAddress.startsWith('Error') || !sourceChain || !contractAddress) {
    console.error('fetchTokenByContract: Invalid input', { walletAddress, sourceChain, contractAddress });
    return null;
  }

  const rpcUrl = useCustomRpc && customRpc ? customRpc : DEFAULT_RPCS[sourceChain];
  if (!rpcUrl) {
    console.error(`fetchTokenByContract: No RPC URL for ${sourceChain}`);
    return null;
  }

  console.log('fetchTokenByContract: RPC config', { rpcUrl });

  if (sourceChain.startsWith('Sepolia') || sourceChain.startsWith('Bob') || sourceChain.startsWith('Corn')) {
    try {
      console.log(`fetchTokenByContract: Connecting to EVM RPC for ${sourceChain}`, { rpcUrl });
      const publicClient = createPublicClient({ 
        chain: sepolia, // Note: Adjust for Bob/Corn if needed
        transport: http(rpcUrl) 
      });

      const tokenAddr = contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`;
      console.log(`fetchTokenByContract: Querying ERC20 contract at ${tokenAddr}`);

      let tokenName = `Token@${tokenAddr.slice(0, 6)}`;
      try {
        const name = await publicClient.readContract({
          address: tokenAddr as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'name',
          args: []
        });
        tokenName = name.toString().substring(0, 10);
        console.log(`fetchTokenByContract: Token name: ${tokenName}`);
      } catch (nameError) {
        console.warn(`fetchTokenByContract: Could not fetch token name for ${tokenAddr}:`, nameError);
      }

      let balance;
      try {
        balance = await publicClient.readContract({
          address: tokenAddr as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress.startsWith('0x') ? walletAddress : `0x${walletAddress}` as `0x${string}`]
        });
        console.log(`fetchTokenByContract: ERC20 balance for ${tokenName}: ${balance.toString()}`);
      } catch (balanceError) {
        console.error(`fetchTokenByContract: Error fetching ERC20 balance for ${tokenName} at ${tokenAddr}:`, balanceError);
        return null;
      }

      const token: Token = {
        name: tokenName,
        address: tokenAddr,
        balance: balance.toString(),
        type: 'erc20'
      };
      console.log(`fetchTokenByContract: Completed for ${sourceChain}`, { token });
      return token;
    } catch (rpcError) {
      console.error(`fetchTokenByContract: RPC error for ${sourceChain}:`, rpcError);
      return null;
    }
  } else {
    try {
      console.log(`fetchTokenByContract: Connecting to Cosmos RPC for ${sourceChain}`, { rpcUrl });
      const cosmWasmClient = await CosmWasmClient.connect(rpcUrl);
      console.log(`fetchTokenByContract: Querying CW20 contract at ${contractAddress}`);

      let tokenName = `Token@${contractAddress.slice(0, 6)}`;
      try {
        const info = await cosmWasmClient.queryContractSmart(contractAddress, { token_info: {} });
        tokenName = info.name.substring(0, 10);
        console.log(`fetchTokenByContract: Token name: ${tokenName}`);
      } catch (nameError) {
        console.warn(`fetchTokenByContract: Could not fetch token name for ${contractAddress}:`, nameError);
      }

      let balance;
      try {
        const queryMsg = { balance: { address: walletAddress } };
        const result = await cosmWasmClient.queryContractSmart(contractAddress, queryMsg);
        balance = result.balance;
        console.log(`fetchTokenByContract: CW20 balance for ${tokenName}: ${balance}`);
      } catch (balanceError) {
        console.error(`fetchTokenByContract: Error fetching CW20 balance for ${tokenName} at ${contractAddress}:`, balanceError);
        return null;
      }

      const token: Token = {
        name: tokenName,
        denom: contractAddress,
        balance,
        type: 'cw20'
      };
      console.log(`fetchTokenByContract: Completed for ${sourceChain}`, { token });
      return token;
    } catch (rpcError) {
      console.error(`fetchTokenByContract: RPC error for ${sourceChain}:`, rpcError);
      return null;
    }
  }
};

export const executeTransfer = async (
  privateKey: string,
  sourceChain: string,
  destChain: string,
  destAddress: string,
  selectedToken: string,
  tokenAddress: string,
  amount: string,
  numTransactions: string,
  useCustomRpc: boolean,
  customRpc: string,
  gasPrice: string,
  tokens: Token[],
  updateLogs: (log: TransactionLog) => void
): Promise<string> => {
  try {
    updateLogs({ message: 'Initiating transfers...', type: 'info' });
    const numTxs = parseInt(numTransactions, 10);
    if (isNaN(numTxs) || numTxs < 1 || numTxs > 100) {
      throw new Error('Number of transactions must be between 1 and 100');
    }
    const selectedTokenData = tokens.find(t => t.name === selectedToken);
    if (!selectedTokenData) throw new Error('No token selected');
    const balance = BigInt(selectedTokenData.balance);
    const transferAmount = BigInt(amount);
    if (transferAmount > balance) throw new Error('Amount exceeds balance');
    const channelId = Object.keys(channels[sourceChain] || {}).find(id =>
      channels[sourceChain]?.[id]?.comments?.includes(destChain)
    );
    if (!channelId) throw new Error('No channel found between the source and destination chains');
    const deploymentInfo = deployments.find(d => d.universal_chain_id === sourceChain);
    if (!deploymentInfo) throw new Error('No deployment found for the source chain');
    const sourceContract = deploymentInfo.deployments.app.ucs03.address;

    for (let i = 1; i <= numTxs; i++) {
      updateLogs({ 
        message: `Transaction ${i}/${numTxs}: Initiating... (${numTxs - i} remaining)`,
        type: 'info'
      });
      if (sourceChain.startsWith('Sepolia') || sourceChain.startsWith('Bob') || sourceChain.startsWith('Corn')) {
        const rpcUrl = useCustomRpc && customRpc ? customRpc : DEFAULT_RPCS[sourceChain];
        const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
        const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
        const walletClient = createWalletClient({
          chain: sepolia,
          transport: http(rpcUrl),
          account
        });
        const gasPriceWei = BigInt(parseFloat(gasPrice) * 1e9);
        const sourceContractAddr = sourceContract.startsWith('0x') ? 
          sourceContract : 
          `0x${sourceContract}` as `0x${string}`;
        const tokenAddr = tokenAddress.startsWith('0x') ? 
          tokenAddress : 
          `0x${tokenAddress}` as `0x${string}`;
        const destAddr = destAddress.startsWith('0x') ? 
          destAddress : 
          `0x${destAddress}` as `0x${string}`;
        const tx = await walletClient.writeContract({
          address: sourceContractAddr as `0x${string}`,
          abi: UCS03_ABI,
          functionName: 'sendPacket',
          args: [destAddr, channelId, amount, tokenAddr],
          gasPrice: gasPriceWei
        });
        const explorerUrl = getExplorerUrl(tx, sourceChain);
        updateLogs({ 
          message: `Transaction ${i}/${numTxs}: EVM tx ${tx} (${numTxs - i} remaining)`, 
          type: 'success' 
        });
        updateLogs({ 
          message: `Explorer: ${explorerUrl}`, 
          type: 'info' 
        });
      } else {
        const rpcUrl = useCustomRpc && customRpc ? customRpc : DEFAULT_RPCS[sourceChain];
        const prefix = sourceChain.includes('Babylon') ? 'bbn' :
                      sourceChain.includes('Xion') ? 'xion' : 
                      sourceChain.includes('Corn') ? 'corn' : 'cosmos';
        const wallet = await DirectSecp256k1Wallet.fromKey(
          Buffer.from(privateKey.replace(/^0x/, ''), 'hex'),
          prefix
        );
        const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet);
        const msg = {
          typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
          value: {
            sender: (await wallet.getAccounts())[0].address,
            contract: sourceContract,
            msg: JSON.stringify({
              send_packet: {
                channel_id: channelId,
                amount,
                denom: tokenAddress,
                receiver: destAddress
              }
            }),
            funds: []
          }
        };
        const result = await client.signAndBroadcast(
          (await wallet.getAccounts())[0].address,
          [msg],
          'auto'
        );
        const explorerUrl = getExplorerUrl(result.transactionHash, sourceChain);
        updateLogs({ 
          message: `Transaction ${i}/${numTxs}: Cosmos tx ${result.transactionHash} (${numTxs - i} remaining)`,
          type: 'success'
        });
        updateLogs({ 
          message: `Explorer: ${explorerUrl}`,
          type: 'info'
        });
      }
    }
    const slaMessage = getSlaMessage(sourceChain, destChain);
    return `Completed ${numTxs} transfers. ${slaMessage}`;
  } catch (error) {
    console.error('executeTransfer: Error:', error);
    updateLogs({ 
      message: `Error: ${(error as Error).message}`,
      type: 'error'
    });
    return `Error: ${(error as Error).message}`;
  }
};
