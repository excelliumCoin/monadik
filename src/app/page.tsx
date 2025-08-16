'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  usePrivy,
  CrossAppAccountWithMetadata,
} from '@privy-io/react-auth';

type UsernameResp =
  | { ok: true; user?: { username?: string; handle?: string } }
  | any;

const MONAD_GAMES_APP_ID = 'cmd8euall0037le0my79qpz42';

export default function Home() {
  const router = useRouter();
  const { ready, authenticated, login, logout, user } = usePrivy();

  const [address, setAddress] = useState<string>('');
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [checkingName, setCheckingName] = useState<boolean>(false);
  const looksValid = useMemo(() => /^0x[a-fA-F0-9]{40}$/.test(address), [address]);

  // Get embedded wallet from Monad Games ID + username
  useEffect(() => {
    if (!ready || !authenticated || !user) return;

    const crossApp = user.linkedAccounts
      .filter(
        (a) =>
          (a as any).type === 'cross_app' &&
          (a as any).providerApp?.id === MONAD_GAMES_APP_ID
      )[0] as CrossAppAccountWithMetadata | undefined;

    const embedded = crossApp?.embeddedWallets?.[0]?.address;
    if (embedded) setAddress(embedded);

    if (embedded) {
      (async () => {
        setCheckingName(true);
        try {
          const r = await fetch(
            `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${embedded}`,
            { cache: 'no-store' }
          );
          const data: UsernameResp = await r.json().catch(() => ({}));
          const name =
            data?.user?.username ??
            data?.user?.handle ??
            data?.username ??
            data?.handle;
          setUsername(typeof name === 'string' && name.trim() ? name.trim() : undefined);
        } catch {/* ignore */} finally { setCheckingName(false); }
      })();
    }
  }, [ready, authenticated, user]);

  const goPlay = () => {
    if (!looksValid) return;
    const q = new URLSearchParams();
    q.set('wallet', address);
    if (username) q.set('u', username);
    router.push(`/game?${q.toString()}`);
  };

  return (
    <div className="home">

      <section className="hero">
        <div className="hero__inner">
          <h1 className="hero__title">Monadik Racer</h1>
          <p className="hero__tagline">
            Mini racing game powered by <b>Monad Games&nbsp;ID</b> <span aria-hidden>🏎️💨</span>
          </p>
        </div>
        <div className="hero__glow" />
      </section>


      <section className="card">
        {!ready ? (
          <div className="loading">Loading authentication…</div>
        ) : !authenticated ? (
          <>
            <h2 className="card__title">Sign in</h2>
            <p className="card__text">
              Use your <b>Monad Games ID</b> to get an embedded wallet instantly and start racing.
            </p>
<div className="btnRow">
  <button className="btn primary" onClick={() => login()}>
    Sign in with Monad Games ID
  </button>
  <Link href="/leaderboard" className="btn leader">
    <span className="ico" aria-hidden>🏆</span>Leaderboard
  </Link>
</div>
          </>
        ) : (
          <>
            <h2 className="card__title">
              Ready to race <span aria-hidden>🏁</span>
            </h2>

            <div className="grid2">
              <div className="kv">
                <div className="kv__key">Status</div>
                <div className="kv__val ok">Signed in ✓</div>
              </div>
              <div className="kv">
                <div className="kv__key">Wallet</div>
                <div className="kv__val mono">{looksValid ? address : '—'}</div>
              </div>
              <div className="kv">
                <div className="kv__key">Username</div>
                <div className="kv__val">
                  {checkingName ? 'Checking…' : username ? `@${username}` : '—'}
                </div>
              </div>
            </div>

            {!username && looksValid && (
              <div className="note">
                You don’t have a username yet. Get one here:{' '}
                <a href="https://monad-games-id-site.vercel.app/" target="_blank" rel="noreferrer">
                  <b>Get Username</b>
                </a>
              </div>
            )}

<div className="btnRow">
  <button className="btn success" onClick={goPlay} disabled={!looksValid}>
    Start Game
  </button>
  <Link href="/leaderboard" className="btn leader">
    <span className="ico" aria-hidden>🏆</span>Leaderboard
  </Link>
  <button className="btn" onClick={() => logout()}>Sign out</button>
</div>
          </>
        )}
      </section>


      <style jsx>{`
        .home {
          min-height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          padding: 24px 16px 48px;
        }

        /* HERO */
        .hero {
          position: relative;
          width: 100%;
          max-width: 1100px;
          padding: 28px 18px 10px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255,255,255,.7), rgba(255,255,255,.35)),
                      radial-gradient(1200px 200px at 20% -20%, rgba(124,58,237,.45), rgba(255,255,255,0));
          border: 1px solid rgba(124,58,237,.25);
          box-shadow: 0 20px 60px rgba(124,58,237,.2);
          backdrop-filter: blur(6px);
        }
        .hero__inner { max-width: 1000px; margin: 0 auto; }
        .hero__title {
          margin: 0; font-size: 38px; line-height: 1.1; font-weight: 1000; letter-spacing: .3px;
          background: linear-gradient(90deg,#5b21b6,#7c3aed,#a78bfa);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          text-shadow: 0 1px 0 rgba(255,255,255,.6);
        }
        .hero__tagline { margin: 6px 0 0; font-size: 16px; opacity: .85; color: #2c1f4a; }
        .hero__glow { position:absolute; inset:-1px; border-radius:18px; pointer-events:none;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.4), 0 40px 120px rgba(91,33,182,.35); }

        /* CARD */
        .card {
          width: 100%; max-width: 900px; margin-top: 10px; padding: 18px; border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.4)),
                      linear-gradient(180deg, rgba(92,28,168,.08), transparent);
          border: 1px solid rgba(0,0,0,.1); box-shadow: 0 12px 40px rgba(0,0,0,.12);
        }
        .card__title { margin: 0 0 6px; font-size: 22px; font-weight: 900; color: #321b6b; }
        .card__text { margin: 0 0 10px; color: #3b2a6d; }

        /* GRID */
        .grid2 { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin-top: 8px; }
        @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }

        .kv { padding:10px; border-radius:12px;
              background: linear-gradient(180deg, rgba(255,255,255,.7), rgba(255,255,255,.45));
              border:1px solid rgba(0,0,0,.08); }
        .kv__key { font-size:12px; color:#6b5aa4; font-weight:800; letter-spacing:.02em; }
        .kv__val { margin-top:4px; font-weight:800; color:#1f1147; }
        .kv__val.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace;
                        font-size:13px; word-break: break-all; }
        .kv__val.ok { color:#065f46; }

        .note { margin-top:10px; padding:10px; border-radius:10px;
                background: rgba(124,58,237,.08); border:1px dashed rgba(124,58,237,.35); color:#3b2a6d; }

        /* BUTTONS */
        .btnRow { margin-top:14px; display:flex; flex-wrap:wrap; gap:8px; }

        /* base .btn — works for both <button> and <a> produced by <Link> */
        .btn,
        a.btn,
        a.btn:link,
        a.btn:visited {
          appearance: none;
          display: inline-flex; align-items: center; gap: 8px;
          background:#2d2f39; color:#f3f6ff;
          border:1px solid rgba(255,255,255,.12);
          padding:10px 14px; border-radius:12px;
          cursor:pointer; font-weight:800; text-decoration:none;
          transition: transform .08s ease, filter .12s ease, box-shadow .12s ease;
        }
        .btn[disabled]{ opacity:.55; cursor:not-allowed; }
        .btn.primary { background: linear-gradient(90deg,#5b21b6,#7c3aed);
                       border-color: rgba(124,58,237,.6);
                       box-shadow: 0 6px 24px rgba(124,58,237,.35); }
        .btn.success { background:#065f46; border-color:#34d399; }

        /* Fancy Leaderboard style */
        .btn.leader,
        a.btn.leader {
          background: linear-gradient(90deg,#5b21b6,#7c3aed,#a78bfa);
          color:#fff;
          border-color: rgba(124,58,237,.55);
          box-shadow: 0 8px 24px rgba(124,58,237,.35);
        }
        .btn.leader:hover,
        a.btn.leader:hover { filter:brightness(1.07); transform: translateY(-1px); }
        .btn.leader:active,
        a.btn.leader:active { transform: translateY(0); }
        .btn.leader .ico { margin-right:6px; }

        .loading { padding:8px 0; opacity:.8; }
      `}</style>
    </div>
  );
}
