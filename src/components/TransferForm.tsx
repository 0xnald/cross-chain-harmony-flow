import React, { useState, useEffect } from 'react';
import { Token, TransactionLog } from '../services/types';
import { channels, DEFAULT_RPCS } from '../services/constants';
import { deriveAddress, fetchTokens, executeTransfer, getChainBadgeClass, getSlaMessage } from '../services/chainService';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TransferForm = () => {
  const [privateKey, setPrivateKey] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [sourceChain, setSourceChain] = useState('Babylon Testnet');
  const [destChain, setDestChain] = useState('Xion Testnet');
  const [amount, setAmount] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [numTransactions, setNumTransactions] = useState('1');
  const [useCustomRpc, setUseCustomRpc] = useState(false);
  const [customRpc, setCustomRpc] = useState('');
  const [gasPrice, setGasPrice] = useState('5');
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('');
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePrivateKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrivateKey = e.target.value;
    setPrivateKey(newPrivateKey);
    if (newPrivateKey) {
      setIsLoading(true);
      try {
        const address = await deriveAddress(newPrivateKey, sourceChain);
        setWalletAddress(address);
        if (!address.startsWith('Error')) {
          const tokens = await fetchTokens(address, sourceChain, useCustomRpc, customRpc);
          console.log('Tokens fetched for wallet:', { sourceChain, walletAddress: address, tokens });
          setTokens(tokens.map(token => ({
            ...token,
            formattedBalance: (Number(token.balance) / (sourceChain.startsWith('Sepolia') ? 1e18 : 1e6)).toFixed(2)
          })));
          toast({ title: "Wallet connected", description: "Your wallet has been successfully connected." });
        } else {
          setTokens([]);
        }
      } catch (error) {
        console.error('Error deriving address:', error);
        toast({ title: "Connection error", description: `${(error as Error).message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      setWalletAddress('');
      setTokens([]);
    }
  };

  const handleSourceChainChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSourceChain = e.target.value;
    setSourceChain(newSourceChain);
    setSelectedToken('');
    setTokenAddress('');
    if (privateKey && newSourceChain) {
      setIsLoading(true);
      try {
        const address = await deriveAddress(privateKey, newSourceChain);
        setWalletAddress(address);
        if (!address.startsWith('Error')) {
          const tokens = await fetchTokens(address, newSourceChain, useCustomRpc, customRpc);
          console.log('Tokens fetched for chain change:', { sourceChain: newSourceChain, walletAddress: address, tokens });
          setTokens(tokens.map(token => ({
            ...token,
            formattedBalance: (Number(token.balance) / (newSourceChain.startsWith('Sepolia') ? 1e18 : 1e6)).toFixed(2)
          })));
        } else {
          setTokens([]);
        }
      } catch (error) {
        console.error('Error deriving address for new chain:', error);
        setTokens([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTokenSelection = (value: string) => {
    setSelectedToken(value);
    const token = tokens.find(t => t.name === value);
    setTokenAddress(token ? (token.denom || token.address || '') : '');
  };

  const handleTransfer = async () => {
    setStatus('');
    setStatusColor('');
    setTransactionLogs([]);
    setIsLoading(true);
    try {
      const result = await executeTransfer(
        privateKey,
        sourceChain,
        destChain,
        destAddress,
        selectedToken,
        tokenAddress,
        amount,
        numTransactions,
        useCustomRpc,
        customRpc,
        gasPrice,
        tokens,
        (log) => setTransactionLogs(prevLogs => [...prevLogs, log])
      );
      if (result.startsWith('Error')) {
        setStatus(result);
        setStatusColor('text-destructive');
        toast({ title: "Transfer failed", description: result, variant: "destructive" });
      } else {
        setStatus(result);
        setStatusColor('text-green-500');
        setPrivateKey('');
        toast({ title: "Transfer successful", description: result });
      }
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
      setStatusColor('text-destructive');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchTokensForChain = async () => {
      if (walletAddress && !walletAddress.startsWith('Error') && sourceChain) {
        setIsLoading(true);
        try {
          const newTokens = await fetchTokens(walletAddress, sourceChain, useCustomRpc, customRpc);
          console.log('Tokens fetched in useEffect:', { sourceChain, walletAddress, tokens: newTokens });
          setTokens(newTokens.map(token => ({
            ...token,
            formattedBalance: (Number(token.balance) / (sourceChain.startsWith('Sepolia') ? 1e18 : 1e6)).toFixed(2)
          })));
          setError(null);
        } catch (error) {
          const errorMessage = (error as Error).message || 'Unknown error fetching tokens';
          console.error('Error fetching tokens in useEffect:', error);
          setError(errorMessage);
          toast({ title: "Error fetching tokens", description: errorMessage, variant: "destructive" });
          setTokens([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setTokens([]);
      }
    };
    fetchTokensForChain();
  }, [sourceChain, walletAddress, useCustomRpc, customRpc]);

  const isFormValid = () => {
    if (!walletAddress || walletAddress.startsWith('Error')) return false;
    if (!amount || !selectedToken || !destAddress || !numTransactions) return false;
    if (sourceChain.startsWith('Sepolia') && !gasPrice) return false;
    const selectedTokenData = tokens.find(t => t.name === selectedToken);
    if (!selectedTokenData) return false;
    try {
      const balance = Number(selectedTokenData.balance) / (sourceChain.startsWith('Sepolia') ? 1e18 : 1e6);
      if (Number(amount) > balance) return false;
      if (parseInt(numTransactions) < 1 || parseInt(numTransactions) > 100) return false;
    } catch {
      return false;
    }
    return true;
  };

  return (
    <div className="max-w-md lg:max-w-xl mx-auto p-4 bg-card rounded-xl shadow-lg border border-border/30">
      {error && (
        <div className="text-destructive text-center mb-4">Error: {error}. Check console for details.</div>
      )}
      <h1 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Cross-Chain Transfer</h1>
      <div className="mb-6 p-2 border border-destructive/30 bg-destructive/5 rounded-md">
        <p className="text-destructive font-medium">
          WARNING: Pasting private keys is insecure. Use only with testnet accounts. Funds may be lost.
        </p>
      </div>

      <div className="mb-4">
        <label className="block font-medium text-sm mb-1">Private Key</label>
        <input
          type="password"
          value={privateKey}
          onChange={handlePrivateKeyChange}
          placeholder="Enter private key (0x...)"
          className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-1.5 flex items-center text-sm">
          <span className="text-muted-foreground mr-2">Wallet Address:</span>
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            <span className="font-mono">{walletAddress || 'Not connected'}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block font-medium text-sm mb-1">Source Chain</label>
          <div className="relative">
            <select 
              value={sourceChain} 
              onChange={handleSourceChainChange}
              className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.keys(channels).map(chain => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {sourceChain && (
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <span className={`chain-badge ${getChainBadgeClass(sourceChain)}`}>
                  {sourceChain.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block font-medium text-sm mb-1">Destination Chain</label>
          <div className="relative">
            <select 
              value={destChain} 
              onChange={(e) => setDestChain(e.target.value)}
              className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.keys(channels).map(chain => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {destChain && (
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <span className={`chain-badge ${getChainBadgeClass(destChain)}`}>
                  {destChain.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {sourceChain && destChain && (
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            {getSlaMessage(sourceChain, destChain) ? (
              <div className="flex items-center p-2 bg-muted/30 rounded">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{getSlaMessage(sourceChain, destChain)}</span>
              </div>
            ) : (
              <div className="flex items-center p-2 bg-destructive/10 rounded">
                <svg className="h-4 w-4 mr-1 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>No direct channel found between these chains</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block font-medium text-sm mb-1">Destination Address</label>
        <input
          type="text"
          value={destAddress}
          onChange={(e) => setDestAddress(e.target.value)}
          placeholder="Receiver address (e.g., bbn1... or 0x...)"
          className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block font-medium text-sm mb-1">Token</label>
          <Select
            value={selectedToken}
            onValueChange={handleTokenSelection}
            disabled={isLoading || !walletAddress || walletAddress.startsWith('Error')}
          >
            <SelectTrigger className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <SelectValue placeholder={isLoading ? "Loading tokens..." : "Select a token"} />
            </SelectTrigger>
            <SelectContent className="bg-muted/50 border border-muted rounded-md">
              {tokens.length === 0 ? (
                <SelectItem value="none" disabled>
                  {isLoading ? "Loading tokens..." : "No tokens available"}
                </SelectItem>
              ) : (
                tokens.map(token => (
                  <SelectItem key={token.name} value={token.name}>
                    {token.name} ({token.formattedBalance}, {token.type})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <label className="block font-medium text-sm mb-1">Amount</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-medium text-sm mb-1">Number of Transactions</label>
        <input
          type="number"
          value={numTransactions}
          onChange={(e) => setNumTransactions(e.target.value)}
          placeholder="Number of transactions (1-100)"
          min="1"
          max="100"
          className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mb-4 border border-muted/50 rounded-lg p-3 bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm">Advanced Options</span>
        </div>
        <div className="mb-3">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={useCustomRpc} 
              onChange={() => setUseCustomRpc(!useCustomRpc)} 
              className="mr-2 h-4 w-4" 
            />
            <span className="text-sm">Use Custom RPC</span>
          </label>
          {useCustomRpc && (
            <input
              type="text"
              value={customRpc}
              onChange={(e) => setCustomRpc(e.target.value)}
              placeholder="Custom RPC URL (e.g., https://rpc.sepolia.org)"
              className="mt-2 w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>
        {(sourceChain.startsWith('Sepolia') || sourceChain.startsWith('Bob') || sourceChain.startsWith('Corn')) && (
          <div>
            <label className="block text-sm mb-1">Gas Price (Gwei)</label>
            <input
              type="number"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
              placeholder="Gas price in Gwei (e.g., 5)"
              min="1"
              className="w-full rounded-md border border-muted bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleTransfer}
        disabled={isLoading || !isFormValid()}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 ${
          isLoading || !isFormValid() 
            ? 'bg-muted cursor-not-allowed opacity-50' 
            : 'bg-primary hover:bg-primary/80'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          'Transfer'
        )}
      </button>

      {status && (
        <div className={`mt-4 p-3 rounded ${
          statusColor === 'text-green-500' ? 'bg-green-500/10 text-green-500' : 
          statusColor === 'text-destructive' ? 'bg-destructive/10 text-destructive' : 
          'bg-blue-500/10 text-blue-500'
        }`}>
          {status}
        </div>
      )}

      {transactionLogs.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Transaction Logs</h3>
          <div className="bg-gray-800 text-white p-4 rounded-lg max-h-64 overflow-y-auto font-mono text-sm border border-muted">
            {transactionLogs.map((log, index) => (
              <p key={index} className={`mb-1 ${
                log.type === 'success' ? 'text-green-500' : 
                log.type === 'error' ? 'text-destructive' : 
                'text-white'
              }`}>
                {log.message}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferForm;
