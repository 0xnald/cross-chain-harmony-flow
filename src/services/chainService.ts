import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { StargateClient, SigningStargateClient } from '@cosmjs/stargate';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { channels, DEFAULT_RPCS, TOKEN_CONFIG, deployments, UCS03_ABI, ERC20_ABI } from './constants';
import { Token, TransactionLog } from './types';

// Get chain badge class based on chain ID
export const getChainBadgeClass = (chainId: string): string => {
  if (chainId.includes('Babylon')) return 'chain-badge-babylon';
  if (chainId.includes('Xion')) return 'chain-badge-xion';
  if (chainId.includes('Sepolia')) return 'chain-badge-ethereum';
  if (chainId.includes('Bob')) return 'chain-badge-bob';
  if (chainId.includes('Corn')) return 'chain-badge-corn';
  return '';
};

// Get SLA message for transfer duration
export const getSlaMessage = (sourceChain: string, destChain: string): string => {
  const channelId = Object.keys(channels[sourceChain] || {}).find(id =>
    channels[sourceChain]?.[id]?.comments?.includes(destChain)
  );
  const sla = channels[sourceChain]?.[channelId]?.sla;
  return sla ? `Transfer may take up to ${sla.replace('PT', '').toLowerCase()}` : '';
};

// Get transaction explorer URL based on chain
export const getExplorerUrl = (txHash: string, chain: string): string => {
  return `https://app.union.build/explorer/${txHash}`;
};

// Derive wallet address from private key
export const deriveAddress = async (privateKey: string, sourceChain: string): Promise<string> => {
  try {
    if (!privateKey) return '';
    
    if (sourceChain.startsWith('Sepolia') || sourceChain.startsWith('Bob') || sourceChain.startsWith('Corn')) {
      const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
      const account = privateKeyToAccount(formattedPrivateKey);
      return account.address;
    } else {
      const prefix = sourceChain.includes('Babylon') ? 'bbn' : 
                    sourceChain.includes('Xion') ? 'xion' : 
                    sourceChain.includes('Corn') ? 'corn' : 'cosmos';
      
      const wallet = await DirectSecp256k1Wallet.fromKey(
        Buffer.from(privateKey.replace(/^0x/, ''), 'hex'),
        prefix
      );
      return (await wallet.getAccounts())[0].address;
    }
  } catch (error) {
    console.error('Error deriving address:', error);
    return `Error: ${(error as Error).message}`;
  }
};

// Fetch available tokens and their balances
export const fetchTokens = async (
  walletAddress: string,
  sourceChain: string,
  useCustomRpc: boolean,
  customRpc: string
): Promise<Token[]> => {
  if (!walletAddress || walletAddress.startsWith('Error') || !sourceChain) return [];

  const rpcUrl = useCustomRpc && customRpc ? customRpc : DEFAULT_RPCS[sourceChain];
  const tokenList = TOKEN_CONFIG[sourceChain] || [];
  const tokens: Token[] = [];

  try {
    if (sourceChain.startsWith('Sepolia') || sourceChain.startsWith('Bob') || sourceChain.startsWith('Corn')) {
      const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
      for (const token of tokenList) {
        let balance;
        if (token.type === 'native') {
          const formattedAddress = walletAddress.startsWith('0x') ? walletAddress as `0x${string}` : `0x${walletAddress}` as `0x${string}`;
          balance = await publicClient.getBalance({ address: formattedAddress });
        } else {
          const tokenAddr = token.address?.startsWith('0x') ? token.address as `0x${string}` : `0x${token.address}` as `0x${string}`;
          balance = await publicClient.readContract({
            address: tokenAddr,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [walletAddress.startsWith('0x') ? walletAddress as `0x${string}` : `0x${walletAddress}` as `0x${string}`]
          });
        }
        tokens.push({ 
          name: token.name, 
          address: token.address, 
          balance: balance.toString(), 
          type: token.type 
        });
      }
    } else {
      const stargateClient = await StargateClient.connect(rpcUrl);
      const cosmWasmClient = await CosmWasmClient.connect(rpcUrl);
      
      for (const token of tokenList) {
        let balance;
        if (token.type === 'native') {
          const result = await stargateClient.getBalance(walletAddress, token.denom!);
          balance = result.amount;
        } else {
          const queryMsg = { balance: { address: walletAddress } };
          const result = await cosmWasmClient.queryContractSmart(token.denom!, queryMsg);
          balance = result.balance;
        }
        tokens.push({ 
          name: token.name, 
          denom: token.denom, 
          balance, 
          type: token.type 
        });
      }
    }
    console.log(`Fetched tokens for ${sourceChain}:`, tokens);
    return tokens;
  } catch (error) {
    console.error(`Error fetching tokens for ${sourceChain}:`, error);
    return [];
  }
};

// Execute transfer between chains
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
        
        const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
        const account = privateKeyToAccount(formattedPrivateKey);
        
        const walletClient = createWalletClient({
          chain: sepolia,
          transport: http(rpcUrl),
          account
        });
        
        const gasPriceWei = BigInt(parseFloat(gasPrice) * 1e9);
        
        const sourceContractAddr = sourceContract.startsWith('0x') ? 
          sourceContract as `0x${string}` : 
          `0x${sourceContract}` as `0x${string}`;
          
        const tokenAddr = tokenAddress.startsWith('0x') ? 
          tokenAddress as `0x${string}` : 
          `0x${tokenAddress}` as `0x${string}`;
          
        const destAddr = destAddress.startsWith('0x') ? 
          destAddress as `0x${string}` : 
          `0x${destAddress}` as `0x${string}`;
        
        const tx = await walletClient.writeContract({
          address: sourceContractAddr,
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
    console.error('Transfer error:', error);
    updateLogs({ 
      message: `Error: ${(error as Error).message}`,
      type: 'error'
    });
    return `Error: ${(error as Error).message}`;
  }
};
