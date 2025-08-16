'use client';

import { usePrivy, useCrossAppAccounts } from '@privy-io/react-auth';
import { useState } from 'react';

export default function LinkMonadGamesButton() {
  const { ready, authenticated } = usePrivy();
  const { linkCrossAppAccount } = useCrossAppAccounts();
  const [busy, setBusy] = useState(false);
  const providerAppId = process.env.NEXT_PUBLIC_MONAD_GAMES_PROVIDER_APP_ID!;

  const link = async () => {
    setBusy(true);
    try {
      await linkCrossAppAccount({ appId: providerAppId });
      // Modal akışı bittiğinde LoginGate otomatik yeniden hesapları okur
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      disabled={!ready || !authenticated || busy}
      onClick={link}
      className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
    >
      {busy ? 'Bağlanıyor…' : 'Monad Games ID’yi Bağla'}
    </button>
  );
}
