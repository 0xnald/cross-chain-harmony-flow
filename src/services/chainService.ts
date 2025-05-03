import { createPublicClient, http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, foundry } from 'viem/chains';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { StargateClient, SigningStargateClient } from '@cosmjs/stargate';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { channels, DEFAULT_RPCS, TOKEN_CONFIG, deployments, UCS03_ABI, ERC20_ABI } from './constants';
import { Token, TransactionLog } from './types';

// ... existing utility functions remain unchanged ...

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

        // Detect chain based on sourceChain string
        const chain = sourceChain.startsWith('Bob') ? foundry : sepolia;

        const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
        const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
        const walletClient = createWalletClient({
          chain,
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
        // Cosmos chain logic unchanged
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
