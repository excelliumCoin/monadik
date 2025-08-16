'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import type { LoginMethodOrderOption } from '@privy-io/react-auth';

const MONAD_GAMES_LOGIN: LoginMethodOrderOption =
  `privy:${process.env.NEXT_PUBLIC_MONAD_GAMES_PROVIDER_APP_ID!}`;

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Embedded wallet oluşturma
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },

        // Wallet seçim ekranı görünümü
        appearance: {
          showWalletLoginFirst: true,
          walletList: ['metamask', 'wallet_connect', 'coinbase_wallet'],
        },

        // SADECE web2 + provider-app sırası (buraya "wallet" KOYMA)
        loginMethodsAndOrder: {
          primary: [
            MONAD_GAMES_LOGIN,
          ] as [LoginMethodOrderOption, ...LoginMethodOrderOption[]],
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
