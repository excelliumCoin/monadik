'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Row = {
  player: `0x${string}`;
  score: bigint | number | string;
  transactions: bigint | number | string;
  username?: string | null;
};

type ApiOk = { ok: true; rows: Row[]; fromBlock?: number | string; toBlock?: number | string };
type ApiErr = { ok: false; error: string };
type ApiResp = ApiOk | ApiErr;

export default function LeaderboardClient() {
  const router = useRouter();
  const params = useSearchParams();

  const initialScope = (params.get('scope') === 'all' ? 'all' : 'game') as 'game' | 'all';
  const initialRange = Math.max(1000, Number(params.get('range') ?? 10000));
  const highlight = params.get('highlight')?.toLowerCase();

  const [scope, setScope] = useState<'game' | 'all'>(initialScope);
  const [range, setRange] = useState<number>(initialRange);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const prettyScope = useMemo(
    () => (scope === 'game' ? 'This Game' : 'All Games'),
    [scope]
  );

  const pushUrl = useCallback(() => {
    const q = new URLSearchParams();
    q.set('scope', scope);
    q.set('range', String(range));
    if (highlight) q.set('highlight', highlight);
    router.replace(`/leaderboard?${q.toString()}`);
  }, [router, scope, range, highlight]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      q.set('scope', scope === 'all' ? 'global' : 'game'); // API 'global' bekliyor
      q.set('range', String(range));
      const r = await fetch(`/api/leaderboard?${q.toString()}`, { cache: 'no-store' });
      const data: ApiResp = await r.json();
      if (!data.ok) {
        const e = (data as ApiErr).error ?? 'unknown';
        throw new Error(e);
      }
      const ordered = [...data.rows].sort(
        (a, b) => Number(b.score) - Number(a.score)
      );
      setRows(ordered);
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [scope, range]);

  useEffect(() => {
    // Sayfa ilk açıldığında mevcut URL paramlarıyla yükle
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lb">
      <div className="lb__head">
        <h1 className="lb__title">
          Leaderboard <span aria-hidden>🏁</span>
        </h1>
        <div className="lb__actions">
          <Link href="/" className="btn">Main Menu</Link>
        </div>
      </div>

      <section className="panel">
        <div className="filters">
          <div className="field">
            <label>Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope((e.target.value as 'game' | 'all') ?? 'game')}
            >
              <option value="game">This Game</option>
              <option value="all">All Games</option>
            </select>
          </div>

          <div className="field">
            <label>Block Range</label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={range}
              onChange={(e) => setRange(Math.max(1000, Number(e.target.value || 0)))}
            />
          </div>

          <div className="field btns">
            <button
              className="btn"
              onClick={() => {
                pushUrl();
                void load();
              }}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="meta">
          <span className="scope">{prettyScope}</span>
          <span className="sep">•</span>
          <span className="range">Last {range.toLocaleString('tr-TR')} Block</span>
          {rows.length > 0 && (
            <>
              <span className="sep">•</span>
              <span className="count">{rows.length} players</span>
            </>
          )}
        </div>

        {err && <div className="error">Failed to load: {err}</div>}
      </section>

      <section className="panel">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th className="colRank">#</th>
                <th>Player</th>
                <th>Score</th>
                <th>Tx</th>
                <th className="colAction"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && !err && (
                <tr>
                  <td colSpan={5} className="empty">No Record Found.</td>
                </tr>
              )}
              {rows.map((r, i) => {
                const addr = r.player.toLowerCase();
                const isMe = highlight && addr === highlight.toLowerCase();
                return (
                  <tr key={`${addr}-${i}`} className={isMe ? 'isMe' : ''}>
                    <td className="colRank">{i + 1}</td>
                    <td className="mono">
                      {r.username ? <b>@{r.username}</b> : <span>{shorten(addr)}</span>}
                    </td>
                    <td><b>{Number(r.score).toLocaleString('tr-TR')}</b></td>
                    <td>{Number(r.transactions).toLocaleString('tr-TR')}</td>
                    <td className="colAction">
                      <Link href={`/profile?address=${addr}`} className="btn" title="Profile">
                        Profile
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .lb { max-width: 1100px; margin: 0 auto; padding: 16px; }

        .lb__head {
          display:flex; justify-content:space-between; align-items:center; gap:12px;
          margin-bottom: 10px;
        }
        .lb__title {
          margin: 0;
          font-size: 30px;
          font-weight: 1000;
          background: linear-gradient(90deg,#5b21b6,#7c3aed,#a78bfa);
          -webkit-background-clip:text; background-clip:text; color:transparent;
          text-shadow: 0 1px 0 rgba(255,255,255,.6);
        }

        .panel{
          background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.42)),
                      linear-gradient(180deg, rgba(92,28,168,.08), transparent);
          border:1px solid rgba(0,0,0,.1);
          box-shadow: 0 12px 38px rgba(0,0,0,.12);
          border-radius:16px;
          padding:14px;
          margin-bottom:14px;
        }

        .filters{ display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; }
        .field{ display:flex; flex-direction:column; gap:6px; }
        .field label{ font-size:12px; font-weight:800; color:#6b5aa4; }
        .field select, .field input{
          height:36px; min-width:160px; padding:6px 10px;
          border:1px solid rgba(0,0,0,.15); border-radius:10px; background:#fff;
          font-weight:700; color:#1f1147;
        }
        .field.btns{ margin-left:auto; }

        .meta{
          margin-top:8px; font-size:12px; color:#51417f; font-weight:800;
          display:flex; align-items:center; gap:6px;
        }
        .meta .sep{ opacity:.6; }
        .scope{ background:#ede9fe; color:#4c1d95; padding:2px 8px; border-radius:999px; }

        .error{
          margin-top:8px; padding:10px; border-radius:10px;
          background: rgba(244,63,94,.1); color:#7f1d1d; border:1px solid rgba(244,63,94,.35);
          font-weight:700;
        }

        .tableWrap{ overflow:auto; }
        .table{ width:100%; border-collapse:separate; border-spacing:0 8px; }
        thead th{
          text-align:left; font-size:12px; color:#6b5aa4; font-weight:900; padding:0 10px;
        }
        tbody td{
          background:#ffffff; padding:12px 10px; border-top:1px solid rgba(0,0,0,.06);
          border-bottom:1px solid rgba(0,0,0,.06); color:#1f1147; font-weight:700;
        }
        tbody tr td:first-child{ border-left:1px solid rgba(0,0,0,.06); border-top-left-radius:12px; border-bottom-left-radius:12px; }
        tbody tr td:last-child{ border-right:1px solid rgba(0,0,0,.06); border-top-right-radius:12px; border-bottom-right-radius:12px; }
        .colRank{ width:72px; }
        .colAction{ width:120px; text-align:right; }
        .empty{ text-align:center; background:transparent; border:none; color:#6b5aa4; font-weight:800; padding:18px 0; }

        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; }

        tr.isMe td{
          background: linear-gradient(90deg, rgba(167,139,250,.22), rgba(236,233,254,.6));
          box-shadow: inset 0 0 0 1px rgba(124,58,237,.35);
        }
      `}</style>
    </div>
  );
}

function shorten(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
}
