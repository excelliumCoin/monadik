'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

const MONAD_GAMES_APP_ID = 'cmd8euall0037le0my79qpz42'; // sizin verdiğiniz

type CheckResp =
  | { ok: true; hasUsername: boolean; username?: string }
  | { ok: false; hasUsername: false; error?: string };

type CrossAppAccount = {
  type: 'cross_app';
  providerApp?: { id?: string };
  embeddedWallets?: Array<{ address?: `0x${string}` }>;
};

export default function HomePage() {
  const router = useRouter();
  const { ready, authenticated, user, login, logout } = usePrivy();

  const [wallet, setWallet] = useState<`0x${string}` | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Privy → Monad Games ID ile oluşturulan embedded cüzdanı bul
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    let found: `0x${string}` | null = null;

    for (const acc of (user.linkedAccounts ?? []) as CrossAppAccount[]) {
      if (acc?.type === 'cross_app' && acc?.providerApp?.id === MONAD_GAMES_APP_ID) {
        const addr = acc.embeddedWallets?.[0]?.address;
        if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
          found = addr;
          break;
        }
      }
    }
    setWallet(found);
  }, [ready, authenticated, user]);

  // Cüzdana göre username’i getir (yoksa hasUsername:false)
  const refreshUsername = async () => {
    if (!wallet) return;
    setChecking(true);
    try {
      const r = await fetch(`/api/check-username?wallet=${wallet}`, { cache: 'no-store' });
      const data: CheckResp = await r.json();
      if (data.ok && data.hasUsername) {
        setUsername((data.username || '').trim() || null);
      } else {
        setUsername(null);
      }
    } catch {
      setUsername(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { refreshUsername(); /* eslint-disable-next-line */ }, [wallet]);

  const canStart = Boolean(wallet); // username zorunlu değilse true bırak
  const usernameMissing = wallet && !username;

  const goGame = () => {
    if (!wallet) return;
    const q = new URLSearchParams();
    q.set('wallet', wallet);
    if (username) q.set('u', username);
    router.push(`/game?${q.toString()}`);
  };

  return (
    <main className="wrap">
      {/* Başlık */}
      <header className="hero panel">
        <h1 className="title">Monadik Racer</h1>
        <p className="sub">
          Mini racing game powered by <b>Monad Games ID</b> 🏎️🧪
        </p>
      </header>

      {/* Kart */}
      <section className="panel card">
        <h2 className="cardTitle">Ready to race 🏁</h2>

        <div className="grid">
          <div className="box">
            <div className="label">Status</div>
            <div className="val">
              {ready ? (authenticated ? <span className="ok">Signed in ✓</span> : 'Signed out') : '…'}
            </div>
          </div>
          <div className="box">
            <div className="label">Wallet</div>
            <div className="val mono">{wallet ?? '—'}</div>
          </div>
        </div>

        <div className="box">
          <div className="label">Username</div>
          <div className="val">
            {checking ? 'Checking…' : username ? <b>@{username}</b> : '—'}
            {usernameMissing && (
              <a
                className="btn ghost"
                href="https://monad-games-id-site.vercel.app/"
                target="_blank"
                rel="noreferrer"
                style={{ marginLeft: 8 }}
                title="Kullanıcı adını al"
              >
                Get username
              </a>
            )}
            {wallet && (
              <button className="btn ghost" onClick={refreshUsername} style={{ marginLeft: 8 }}>
                Refresh
              </button>
            )}
          </div>
        </div>

        <div className="actions">
          {authenticated ? (
            <>
              <button className="btn primary" disabled={!canStart} onClick={goGame}>
                Start Game
              </button>

              <Link href="/leaderboard" className="btn leader">
                <span className="ico" aria-hidden>🏆</span> Leaderboard
              </Link>

              <button className="btn dark" onClick={() => logout()}>
                Sign out
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={() => login()}>
              Sign in with Monad Games ID
            </button>
          )}
        </div>
      </section>

      <style jsx>{`
        .wrap { max-width: 1100px; margin: 0 auto; padding: 16px; }
        .panel{
          background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.42)),
                      linear-gradient(180deg, rgba(92,28,168,.08), transparent);
          border:1px solid rgba(0,0,0,.08);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(124,58,237,.15);
          padding: 16px 18px;
          margin-bottom: 16px;
        }
        .title{
          margin:0; font-size:40px; font-weight:1000;
          background: linear-gradient(90deg,#5b21b6,#7c3aed,#a78bfa);
          -webkit-background-clip:text; background-clip:text; color:transparent;
          text-shadow: 0 1px 0 rgba(255,255,255,.6);
        }
        .sub{ margin:.5rem 0 0; color:#51417f; font-weight:800; }
        .cardTitle{ margin:0 0 8px; font-weight:900; color:#1f1147; }
        .grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .box{
          background:#fff; border:1px solid rgba(0,0,0,.08);
          border-radius:12px; padding:12px;
        }
        .label{ font-size:12px; font-weight:900; color:#6b5aa4; }
        .val{ margin-top:4px; font-weight:800; color:#1f1147; }
        .ok{ color:#047857; }
        .mono{ font-family: ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace; }
        .actions{ display:flex; gap:10px; margin-top:14px; }
        .btn{ background:#2d2f39; color:#f3f6ff; border:1px solid rgba(255,255,255,.12);
              padding:10px 14px; border-radius:12px; font-weight:800; }
        .btn.primary{ background:#5b21b6; border-color:#7c3aed; box-shadow:0 0 0 2px rgba(124,58,237,.25) inset; }
        .btn.dark{ background:#111827; }
        .btn.ghost{ background:#fff; color:#4c1d95; border-color:#c4b5fd; }
        .btn.leader{ background:#6d28d9; border-color:#a78bfa; }
        .ico{ margin-right:6px }
      `}</style>
    </main>
  );
}
