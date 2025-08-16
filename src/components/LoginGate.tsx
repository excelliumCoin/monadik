// src/components/LoginGate.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  usePrivy,
  CrossAppAccountWithMetadata,
  useWallets,
} from '@privy-io/react-auth';
import UsernamePrompt from './UsernamePrompt';

type UsernameCheck = { ok: boolean; hasUsername: boolean; username?: string; error?: string };

export default function LoginGate({
  onReadyToStart,
}: {
  onReadyToStart: (params: { wallet: string; username?: string }) => void;
}) {
  const { authenticated, user, ready, login, logout } = usePrivy();
  const { wallets } = useWallets(); // Fallback için
  const [wallet, setWallet] = useState<string>();
  const [usernameInfo, setUsernameInfo] = useState<UsernameCheck | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [checking, setChecking] = useState(false);

  const providerId = process.env.NEXT_PUBLIC_MONAD_GAMES_PROVIDER_APP_ID!;
  // 1) Cross-app hesabı yakala
  const crossApp = useMemo(() => {
    if (!user) return undefined;
    return user.linkedAccounts
      .filter((a) => (a as any).type === 'cross_app')
      .find(
        (a: any) =>
          (a as CrossAppAccountWithMetadata).providerApp?.id === providerId
      ) as CrossAppAccountWithMetadata | undefined;
  }, [user, providerId]);

  // 2) Cüzdan adresini elde et (önce cross_app → sonra fallback)
  useEffect(() => {
    if (!ready || !authenticated) return;

    // öncelik: cross-app embedded wallet
    const fromCrossApp = crossApp?.embeddedWallets?.[0]?.address;
    if (fromCrossApp) {
      console.debug('[LoginGate] wallet from cross_app:', fromCrossApp);
      setWallet(fromCrossApp);
      return;
    }

    // fallback 1: Privy wallets hook
    const fromWallets = wallets?.[0]?.address;
    if (fromWallets) {
      console.debug('[LoginGate] wallet from useWallets:', fromWallets);
      setWallet(fromWallets);
      return;
    }

    // fallback 2: bazı durumlarda user.wallet olabilir (SDK sürümüne göre)
    const maybeUserWallet =
      (user as any)?.wallet?.address ??
      (user as any)?.wallets?.[0]?.address ??
      undefined;
    if (maybeUserWallet) {
      console.debug('[LoginGate] wallet from user.*:', maybeUserWallet);
      setWallet(maybeUserWallet);
      return;
    }

    console.debug('[LoginGate] no wallet found yet; waiting…');
  }, [ready, authenticated, crossApp, wallets, user]);

  // 3) Username kontrol fonksiyonu (sonuca göre modal durumunu belirler)
  const runUsernameCheck = async (addr: string) => {
    setChecking(true);
    try {
      console.debug('[LoginGate] check username for:', addr);
      const r = await fetch(`/api/check-username?wallet=${addr}`, { cache: 'no-store' });
      const data: UsernameCheck = await r.json();
      console.debug('[LoginGate] check-username response:', data);
      setUsernameInfo(data);
      setShowUsernameModal(!(data && data.hasUsername === true)); // sadece true ise kapat
    } catch (e) {
      console.warn('[LoginGate] check-username error:', e);
      setUsernameInfo({ ok: false, hasUsername: false, error: String(e) });
      setShowUsernameModal(true);
    } finally {
      setChecking(false);
    }
  };

  // 4) Cüzdan bulununca otomatik username kontrolü
  useEffect(() => {
    if (wallet) runUsernameCheck(wallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  // 5) Pencere odağına dönünce yeniden kontrol (kullanıcı adı dış sayfada alınmış olabilir)
  useEffect(() => {
    const onFocus = () => {
      if (wallet) runUsernameCheck(wallet);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [wallet]);

  const canStart = authenticated && !!wallet && usernameInfo?.hasUsername === true;

  return (
    <div className="space-y-3">
      {!authenticated ? (
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => login()}
        >
          Monad Games ID ile Giriş Yap
        </button>
      ) : (
        <div className="space-y-2">
          <div className="text-sm">
            <div>Durum: Giriş yapıldı ✅</div>
            <div>Cüzdan: {wallet ?? 'alınıyor…'}</div>
          </div>

          {checking && <div>Kullanıcı adı kontrol ediliyor…</div>}

          {/* ZORUNLU MODAL: username yoksa veya tespit edilemiyorsa aç */}
          {showUsernameModal && wallet && (
            <UsernamePrompt
              wallet={wallet}
              onRecheck={() => runUsernameCheck(wallet)}
            />
          )}

          {/* Bilgi kartı (opsiyonel) */}
          {usernameInfo && usernameInfo.hasUsername !== true && (
            <div className="p-3 border rounded bg-amber-50">
              <div className="font-medium mb-1">
                Kullanıcı adın bulunamadı. Oluşturduktan sonra “Tekrar kontrol et”e bas.
              </div>
              <a
                className="inline-block px-3 py-2 rounded bg-blue-600 text-white"
                href="https://monad-games-id-site.vercel.app/"
                target="_blank"
                rel="noreferrer"
              >
                Kullanıcı adını al
              </a>
              <button
                className="ml-2 inline-block px-3 py-2 rounded border"
                onClick={() => wallet && runUsernameCheck(wallet)}
              >
                Tekrar kontrol et
              </button>
              {usernameInfo?.error && (
                <div className="mt-2 text-xs text-red-600">
                  (Uyarı: {usernameInfo.error})
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              disabled={!canStart}
              className={`px-4 py-2 rounded ${
                canStart
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
              onClick={() =>
                wallet &&
                onReadyToStart({
                  wallet,
                  username: usernameInfo?.username, // page.tsx → `u` query’sine ekleniyor
                })
              }
            >
              Start Game
            </button>
            <button className="px-4 py-2 rounded border" onClick={() => logout()}>
              Çıkış
            </button>
          </div>

          {!crossApp && (
            <div className="text-xs text-red-600">
              Bu uygulamaya <b>Monad Games ID</b> hesabını bağlaman gerekiyor (cross_app).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
