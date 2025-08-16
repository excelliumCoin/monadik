'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type StatsResp =
  | {
      ok: true;
      total?: { score: string; transactions: string };
      game?: { score: string; transactions: string; gameAddress?: string };
      error?: string;
    }
  | { ok: false; error: string };

type EventRow = {
  blockNumber: number | string;
  scoreAmount: number | string | bigint;
  transactionAmount: number | string | bigint;
  game: `0x${string}`;
  txHash: `0x${string}`;
};

type EventsResp =
  | { ok: true; events?: EventRow[] } 
  | { ok: false; error: string };

export default function ProfilePage() {
  const params = useSearchParams();
  const router = useRouter();

  const address = (params.get('address') || '').toLowerCase();
  const walletLooksValid = useMemo(() => /^0x[a-fA-F0-9]{40}$/.test(address), [address]);

  const [username, setUsername] = useState<string | undefined>(undefined);

  const [stats, setStats] = useState<StatsResp | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [range, setRange] = useState<number>(8000);
  const [limit, setLimit] = useState<number>(25);

  // Username lookup
  useEffect(() => {
    if (!walletLooksValid) return;
    (async () => {
      try {
        const r = await fetch(
          `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${address}`,
          { cache: 'no-store' }
        );
        const data = await r.json().catch(() => ({} as any));
        const name =
          data?.user?.username ??
          data?.user?.handle ??
          data?.username ??
          data?.handle;
        setUsername(typeof name === 'string' && name.trim() ? name.trim() : undefined);
      } catch {
        setUsername(undefined);
      }
    })();
  }, [address, walletLooksValid]);

  const loadStats = async () => {
    if (!walletLooksValid) return;
    setLoadingStats(true);
    try {
      const r = await fetch(`/api/get-stats?player=${address}`, { cache: 'no-store' });
      const data: StatsResp = await r.json();
      setStats(data);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadEvents = async () => {
    if (!walletLooksValid) return;
    setLoadingEvents(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/player/events?player=${address}&range=${range}&limit=${limit}`,
        { cache: 'no-store' }
      );
      const data: EventsResp = await r.json();
      if (!data.ok) throw new Error((data as any).error || 'unknown');

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e: any) {
      setErr(e?.message ?? 'unknown');
      setEvents([]); 
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (walletLooksValid) {
      loadStats();
      loadEvents();
    }

  }, [address]);

  if (!walletLooksValid) {
    return (
      <div className="pf">
        <div className="pf__head">
          <h1 className="title">Profile</h1>
          <Link href="/" className="btn">Home</Link>
        </div>
        <div className="panel">
          <div className="error">Invalid wallet address.</div>
        </div>
      </div>
    );
  }

  const explorerTxBase = process.env.NEXT_PUBLIC_EXPLORER_TX || '';
  const evs = Array.isArray(events) ? events : []; 

  return (
    <div className="pf">

      <div className="pf__head">
        <div>
          <h1 className="title">Profile <span aria-hidden>🏁</span></h1>
          <div className="sub">
            {username ? <b>@{username}</b> : <span className="muted">anonymous</span>}
            <span className="dot">•</span>
            <span className="mono">{shorten(address)}</span>
          </div>
        </div>
        <div className="headBtns">
          <Link href="/leaderboard" className="btn leader">
            <span className="ico" aria-hidden>🏆</span>Leaderboard
          </Link>
          <Link href="/" className="btn">Home</Link>
        </div>
      </div>

      {/* Stats */}
      <section className="panel">
        <h3 className="sectionTitle">Stats</h3>
        {loadingStats && <div className="muted tiny">Loading…</div>}
        {stats?.ok ? (
          <div className="cards">
            <div className="statCard">
              <div className="key">Total Score</div>
              <div className="val">{Number(stats.total?.score ?? 0).toLocaleString('tr-TR')}</div>
            </div>
            <div className="statCard">
              <div className="key">Total Tx</div>
              <div className="val">{Number(stats.total?.transactions ?? 0).toLocaleString('tr-TR')}</div>
            </div>
            <div className="statCard">
              <div className="key">This Game Score</div>
              <div className="val">{Number(stats.game?.score ?? 0).toLocaleString('tr-TR')}</div>
            </div>
            <div className="statCard">
              <div className="key">This Game Tx</div>
              <div className="val">{Number(stats.game?.transactions ?? 0).toLocaleString('tr-TR')}</div>
            </div>
          </div>
        ) : (
          <div className="error small">Couldn’t load stats: {stats && (stats as any).error}</div>
        )}
        {stats?.ok && stats.game?.gameAddress && (
          <div className="muted tiny mono" style={{ marginTop: 8 }}>
            game address: {stats.game.gameAddress}
          </div>
        )}
      </section>


      <section className="panel">
        <div className="sectionRow">
          <h3 className="sectionTitle">Recent updates</h3>
          <div className="controls">
            <label>
              Range
              <input
                type="number"
                min={1000}
                step={1000}
                value={range}
                onChange={(e) => setRange(Math.max(1000, Number(e.target.value || 0)))}
              />
            </label>
            <label>
              Limit
              <input
                type="number"
                min={5}
                max={100}
                step={5}
                value={limit}
                onChange={(e) => setLimit(Math.max(5, Math.min(100, Number(e.target.value || 0))))}
              />
            </label>
            <button className="btn" onClick={loadEvents} disabled={loadingEvents}>
              {loadingEvents ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {err && <div className="error">Failed: {err}</div>}

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th className="colBlock">Block</th>
                <th className="colNum">Score</th>
                <th className="colNum">TxΔ</th>
                <th>Game</th>
                <th>Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {evs.length === 0 && !loadingEvents && !err && (
                <tr>
                  <td colSpan={5} className="empty">No records.</td>
                </tr>
              )}

              {evs.map((ev, i) => {
                const tx = ev.txHash;
                const href = explorerTxBase ? `${explorerTxBase}${tx}` : undefined;
                return (
                  <tr key={`${String(ev.blockNumber)}-${i}`}>
                    <td className="mono">{String(ev.blockNumber)}</td>
                    <td className="mono">{Number(ev.scoreAmount).toLocaleString('tr-TR')}</td>
                    <td className="mono">{Number(ev.transactionAmount).toLocaleString('tr-TR')}</td>
                    <td className="mono">{shorten(ev.game)}</td>
                    <td className="mono">
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="txLink">
                          {shorten(tx)}
                        </a>
                      ) : (
                        shorten(tx)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>


      <style jsx>{`
        .pf { max-width: 1100px; margin: 0 auto; padding: 16px; }

        .pf__head{
          display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
          margin-bottom:12px;
        }
        .title{
          margin:0; font-size:30px; font-weight:1000;
          background:linear-gradient(90deg,#5b21b6,#7c3aed,#a78bfa);
          -webkit-background-clip:text; background-clip:text; color:transparent;
          text-shadow:0 1px 0 rgba(255,255,255,.6);
        }
        .sub{ margin-top:6px; display:flex; gap:8px; align-items:center; font-weight:800; color:#1f1147; }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; }
        .muted{ color:#6b5aa4; font-weight:800; }
        .dot{ opacity:.6; }

        .headBtns{ display:flex; gap:8px; }

        .panel{
          background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.42)),
                      linear-gradient(180deg, rgba(92,28,168,.08), transparent);
          border:1px solid rgba(0,0,0,.1);
          box-shadow: 0 12px 38px rgba(0,0,0,.12);
          border-radius:16px;
          padding:14px;
          margin-bottom:14px;
        }

        .sectionTitle{ margin:0; font-size:18px; font-weight:900; color:#321b6b; }
        .sectionRow{ display:flex; justify-content:space-between; align-items:center; gap:10px; }

        .cards{
          margin-top:10px;
          display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px;
        }
        @media (max-width: 800px){
          .cards{ grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media (max-width: 480px){
          .cards{ grid-template-columns:1fr; }
        }
        .statCard{
          border-radius:12px;
          background: #fff;
          border:1px solid rgba(0,0,0,.06);
          padding:12px;
        }
        .statCard .key{ font-size:12px; color:#6b5aa4; font-weight:900; }
        .statCard .val{ font-size:22px; font-weight:1000; color:#1f1147; margin-top:4px; }

        .controls{ display:flex; gap:8px; align-items:flex-end; }
        .controls label{ display:flex; flex-direction:column; gap:6px; font-size:12px; font-weight:900; color:#6b5aa4; }
        .controls input{
          height:36px; width:120px; padding:6px 10px; border:1px solid rgba(0,0,0,.15); border-radius:10px; background:#fff;
          font-weight:700; color:#1f1147;
        }

        .error{
          margin-top:8px; padding:10px; border-radius:10px;
          background: rgba(244,63,94,.1); color:#7f1d1d; border:1px solid rgba(244,63,94,.35);
          font-weight:700;
        }
        .error.small{ margin-top:6px; }

        .tableWrap{ overflow:auto; margin-top:8px; }
        .table{ width:100%; border-collapse:separate; border-spacing:0 8px; }
        thead th{
          text-align:left; font-size:12px; color:#6b5aa4; font-weight:900; padding:0 10px;
        }
        tbody td{
          background:#fff; padding:12px 10px; border-top:1px solid rgba(0,0,0,.06);
          border-bottom:1px solid rgba(0,0,0,.06); color:#1f1147; font-weight:700;
        }
        tbody tr td:first-child{ border-left:1px solid rgba(0,0,0,.06); border-top-left-radius:12px; border-bottom-left-radius:12px; }
        tbody tr td:last-child{ border-right:1px solid rgba(0,0,0,.06); border-top-right-radius:12px; border-bottom-right-radius:12px; }
        .colBlock{ width:130px; }
        .colNum{ width:120px; text-align:right; }
        .empty{ text-align:center; background:transparent; border:none; color:#6b5aa4; font-weight:800; padding:18px 0; }

        .txLink{ color:#4c1d95; text-decoration:none; }
        .txLink:hover{ text-decoration:underline; }
      `}</style>
    </div>
  );
}

function shorten(addr: string) {
  if (!addr) return '';
  const s = addr.toString();
  return s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
}
