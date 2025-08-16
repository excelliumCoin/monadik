import { createPublicClient, createWalletClient, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const monadTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || 10143),
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
    public:  { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
  },
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export const walletClient = createWalletClient({
  chain: monadTestnet,
  transport: http(),
  account: privateKeyToAccount(process.env.SERVER_PRIVATE_KEY as `0x${string}`),
});
