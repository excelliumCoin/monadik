'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type StatsResp =
  | {
      ok: true;
      total?: { score: string; transactions: string };
      game?: { score: string; transactions: string; gameAddress: string };
    }
  | { ok: false; error?: string };

type EventRow = {
  blockNumber: string;
  txHash: string;
  game: string;
  player: string;
  scoreAmount: string;
  transactionAmount: string;
};

type EventsResp =
  | { ok: true; rows: EventRow[]; fromBlock?: string; toBlock?: string }
  | { ok: false; error?: string };

export default function ProfileClient() {
  const params = useSearchParams();
  const router = useRouter();

  const addressParam = params.get('address') ?? '';
  const address = addressParam.toLowerCase() as `0x${string}`;
  const walletLooksValid = /^0x[a-fA-F0-9]{40}$/.test(address);

  const [stats, setStats] = useState<StatsResp | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shortAddr = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''),
    [address]
  );

  const loadStats = useCallback(async () => {
    if (!walletLooksValid) return;
    setLoadingStats(true);
    try {
      const r = await fetch(`/api/get-stats?player=${address}`, { cache: 'no-store' });
      const data: StatsResp = await r.json();
      setStats(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown';
      setErr(`Stats error: ${msg}`);
    } finally {
      setLoadingStats(false);
    }
  }, [address, walletLooksValid]);

  const loadEvents = useCallback(async () => {
    if (!walletLooksValid) return;
    setLoadingEvents(true);
    try {
      const r = await fetch(`/api/player/events?player=${address}&limit=50&range=10000`, { cache: 'no-store' });
      const data: EventsResp = await r.json();
      if ('ok' in data && data.ok) {
        setEvents(data.rows);
      } else {
        setErr(`Events error: ${(data as { error?: string })?.error ?? 'unknown'}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown';
      setErr(`Events error: ${msg}`);
    } finally {
      setLoadingEvents(false);
    }
  }, [address, walletLooksValid]);

  useEffect(() => {
    if (walletLooksValid) {
      loadStats();
      loadEvents();
    }
  }, [walletLooksValid, loadStats, loadEvents]);

  if (!walletLooksValid) {
    return (
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        <div className="panel">
          <h1 style={{ margin: 0, fontWeight: 1000, fontSize: 28 }}>Profile</h1>
          <div className="error" style={{ marginTop: 8 }}>
            Invalid or missing wallet address.
          </div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => router.push('/')}>
            Back to Menu
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 1000, fontSize: 28, lineHeight: 1 }}>
              Profile
            </h1>
            <div style={{ marginTop: 6, fontSize: 12, color: '#4c1d95', fontWeight: 800 }}>
              Wallet: <code className="mono">{address}</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => router.push(`/leaderboard?scope=game&highlight=${address}`)}>
              Leaderboard
            </button>
            <button className="btn" onClick={() => router.push('/')}>Menu</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8, color: '#4c1d95' }}>On-chain Stats</div>
        {loadingStats ? (
          <div className="muted tiny">Loading…</div>
        ) : stats && 'ok' in stats && stats.ok ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            <div className="stat"><div className="muted tiny">Total Score</div><div className="big">{stats.total?.score ?? '-'}</div></div>
            <div className="stat"><div className="muted tiny">Total Tx</div><div className="big">{stats.total?.transactions ?? '-'}</div></div>
            <div className="stat"><div className="muted tiny">This Game Score</div><div className="big">{stats.game?.score ?? '-'}</div></div>
            <div className="stat"><div className="muted tiny">This Game Tx</div><div className="big">{stats.game?.transactions ?? '-'}</div></div>
          </div>
        ) : (
          <div className="error tiny">Failed to load stats: {(stats as { error?: string })?.error ?? ''}</div>
        )}
      </div>

      {/* Recent events */}
      <div className="panel">
        <div style={{ fontWeight: 900, marginBottom: 8, color: '#4c1d95' }}>Recent On-chain Events</div>
        {loadingEvents ? (
          <div className="muted tiny">Loading…</div>
        ) : events.length === 0 ? (
          <div className="muted tiny">No events.</div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Tx</th>
                  <th>Score</th>
                  <th>Tx Count</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.txHash}>
                    <td className="mono">{ev.blockNumber}</td>
                    <td className="mono" title={ev.txHash}>{short(ev.txHash)}</td>
                    <td><b>{Number(ev.scoreAmount).toLocaleString('tr-TR')}</b></td>
                    <td>{Number(ev.transactionAmount).toLocaleString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
      </div>

      <style jsx>{`
        .panel{
          background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.42)),
                      linear-gradient(180deg, rgba(92,28,168,.08), transparent);
          border:1px solid rgba(0,0,0,.1);
          box-shadow: 0 12px 38px rgba(0,0,0,.12);
          border-radius:16px;
          padding:14px;
        }
        .btn { background:#2d2f39; color:#f3f6ff; border:1px solid rgba(255,255,255,.12);
          padding:8px 12px; border-radius:10px; cursor:pointer; font-weight:600; }
        .muted { color:#475569; font-weight:700; letter-spacing:.02em; }
        .tiny { font-size:12px; }
        .big { font-size:20px; font-weight:800; color:#0f172a; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; }
        .tableWrap{ overflow:auto; margin-top:8px; }
        .table{ width:100%; border-collapse:separate; border-spacing:0 8px; }
        thead th{ text-align:left; font-size:12px; color:#6b5aa4; font-weight:900; padding:0 10px; }
        tbody td{
          background:#ffffff; padding:12px 10px; border-top:1px solid rgba(0,0,0,.06);
          border-bottom:1px solid rgba(0,0,0,.06); color:#1f1147; font-weight:700;
        }
        tbody tr td:first-child{ border-left:1px solid rgba(0,0,0,.06); border-top-left-radius:12px; border-bottom-left-radius:12px; }
        tbody tr td:last-child{ border-right:1px solid rgba(0,0,0,.06); border-top-right-radius:12px; border-bottom-right-radius:12px; }
      `}</style>
    </main>
  );
}

function short(v: string) {
  return v ? `${v.slice(0, 8)}…${v.slice(-6)}` : '';
}
