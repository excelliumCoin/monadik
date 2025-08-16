'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

type Stats = {
  ok: boolean;
  total?: { score: string; transactions: string };
  game?: { score: string; transactions: string; gameAddress: string };
  error?: string;
};

export default function GameClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, authenticated } = usePrivy();

  const wallet = params.get('wallet') ?? '';
  const username = params.get('u') ?? undefined;
  const walletLooksValid = /^0x[a-fA-F0-9]{40}$/.test(wallet);

  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [laps, setLaps] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [playerLane, setPlayerLane] = useState(1);
  const [playerForward, setPlayerForward] = useState(0);

  const [pending, setPending] = useState<{ score: number; laps: number } | null>(null);

  const clearWorldRef = useRef<() => void>(() => {});

  const MAX_FORWARD = 200;
  const STEP_FORWARD = 28;

  const startNewRun = () => {
    if (!walletLooksValid) return setMessage('Invalid wallet address.');
    clearWorldRef.current();
    setScore(0);
    setLaps(0);
    setPlayerLane(1);
    setPlayerForward(0);
    setMessage(null);
    setRunning(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') setPlayerLane((v) => Math.max(0, v - 1));
      if (key === 'arrowright' || key === 'd') setPlayerLane((v) => Math.min(2, v + 1));
      if (key === 'arrowup' || key === 'w') setPlayerForward((p) => Math.min(MAX_FORWARD, p + STEP_FORWARD));
      if (key === 'arrowdown' || key === 's') setPlayerForward((p) => Math.max(0, p - STEP_FORWARD));
      if ((key === ' ' || e.code === 'Space') && !running) startNewRun();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const fetchStats = async () => {
    if (!walletLooksValid) return;
    setLoadingStats(true);
    try {
      const r = await fetch(`/api/get-stats?player=${wallet}`, { cache: 'no-store' });
      const data: Stats = await r.json();
      setStats(data);
    } finally {
      setLoadingStats(false);
    }
  };
  useEffect(() => { if (walletLooksValid) fetchStats(); /* eslint-disable-next-line */ }, [wallet]);

  const submit = async () => {
    const finalScore = pending?.score ?? score;
    const finalLaps = pending?.laps ?? laps;
    if (!walletLooksValid) return setMessage('Invalid wallet address.');
    if (finalScore <= 0) return setMessage('No score to save.');

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/update-player', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ player: wallet, scoreAmount: finalScore, transactionAmount: finalLaps }),
      });
      const data = await res.json();

      if (data.ok) {
        const tx: string =
          (data.tx as string) ||
          (data.hash as string) ||
          (data.transactionHash as string) ||
          '';
        const base = process.env.NEXT_PUBLIC_EXPLORER_TX || '';
        const msg = tx
          ? base
            ? `Score recorded on-chain! Tx: ${tx} — ${base}${tx}`
            : `Score recorded on-chain! Tx: ${tx}`
          : 'Score recorded on-chain!';
        setMessage(msg);
        setPending(null);
        fetchStats();
      } else {
        setMessage(`Error: ${data.error ?? 'unknown'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const hardReset = () => {
    clearWorldRef.current();
    setRunning(false);
    setScore(0);
    setLaps(0);
    setPlayerLane(1);
    setPlayerForward(0);
    setPending(null);
    setMessage(null);
  };

  if (!ready) {
    return (
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontWeight: 900, fontSize: 28 }}>Monadik Racer</h1>
        <div style={{ opacity: .7, marginTop: 8 }}>Loading…</div>
      </main>
    );
  }
  if (ready && !authenticated) {
    return (
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontWeight: 900, fontSize: 28 }}>Monadik Racer</h1>
        <div style={{ marginTop: 8 }}>You must sign in to play.</div>
        <button className="btn" style={{ marginTop: 10 }} onClick={() => router.push('/')}>Back to menu</button>
      </main>
    );
  }
  if (!walletLooksValid) {
    return (
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: 28 }}>Monadik Racer</h1>
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10, background: '#fffbe6' }}>
          Wallet address not found or invalid. Please start from the menu.
        </div>
        <button onClick={() => router.push('/')} style={{ marginTop: 12 }} className="btn">Main Menu</button>
      </main>
    );
  }

  const effectiveScore = pending?.score ?? score;
  const effectiveLaps  = pending?.laps  ?? laps;
  const canSave = effectiveScore > 0 && !saving;

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 30, margin: 0 }}>Monadik Racer</h1>
          <div style={{ fontSize: 12, opacity: .85, marginTop: 4 }}>
            {username ? <>Player: <b>@{username}</b> • </> : null}
            Wallet: <code>{wallet}</code>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => router.push(`/leaderboard?scope=game&highlight=${wallet}`)}>Leaderboard</button>
          <button className="btn" onClick={() => router.push(`/profile?address=${wallet}`)}>Profile</button>
          <button className="btn" onClick={() => router.push('/')}>Menu</button>
        </div>
      </div>

      <div className="row">
        <aside className="panel side">
          <div className="title">Controls</div>

          {pending && (
            <div className="note" style={{ marginBottom: 8 }}>
              Unsaved score: <b>{pending.score}</b> • Laps: <b>{pending.laps}</b>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="btn primary" onClick={startNewRun} disabled={running}>Start</button>
            <button className="btn" onClick={() => setRunning(false)} disabled={!running}>Stop</button>
            <button className="btn success" onClick={submit} disabled={!canSave}>
              {saving ? 'Saving…' : 'Save Score'}
            </button>
            <button className="btn" onClick={hardReset}>Reset</button>
          </div>

          <div className="hint">Move with ← → (A/D) and ↑ ↓ (W/S). Space starts a new run.</div>
          {message && <div className="note" style={{ marginTop: 8 }}>{message}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 8 }}>
            <div className="stat"><div className="muted tiny">Score</div><div className="big">{effectiveScore}</div></div>
            <div className="stat"><div className="muted tiny">Laps</div><div className="big">{effectiveLaps}</div></div>
          </div>
        </aside>

        <section className="gameWrap">
          <CanvasStage
            running={running}
            playerLane={playerLane}
            playerForward={playerForward}
            playerCarSrc="/cars/player.png"
            enemyCarSrcs={['/cars/1.png','/cars/2.png','/cars/3.png','/cars/4.png']}
            onTick={(delta) => setScore((s) => s + delta)}
            onLap={() => setLaps((v) => v + 1)}
            onCrash={() => {
              setRunning(false);
              setPending({ score, laps });
              setMessage('Crashed! Run stopped. You can save your score or press Start to play again.');
            }}
            bindClearWorld={(fn) => (clearWorldRef.current = fn)}
          />
        </section>

        <aside className="panel side">
          <div className="title">On-chain Stats</div>
          {loadingStats && <div className="muted tiny">Loading…</div>}
          {stats?.ok ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 8 }}>
              <div className="stat"><div className="muted tiny">Total Score</div><div className="big">{stats.total?.score ?? '-'}</div></div>
              <div className="stat"><div className="muted tiny">Total Tx</div><div className="big">{stats.total?.transactions ?? '-'}</div></div>
              <div className="stat"><div className="muted tiny">This Game Score</div><div className="big">{stats.game?.score ?? '-'}</div></div>
              <div className="stat"><div className="muted tiny">This Game Tx</div><div className="big">{stats.game?.transactions ?? '-'}</div></div>
            </div>
          ) : (
            <div className="err tiny">Failed to load stats: {stats?.error ?? ''}</div>
          )}
          {stats?.game?.gameAddress && (
            <div className="muted tiny mono" style={{ marginTop: 6 }}>
              game address: {stats.game.gameAddress}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={fetchStats} disabled={loadingStats}>Refresh</button>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .row { display:flex; gap:16px; align-items:flex-start; justify-content:center; }
        .side { width:320px; flex:0 0 320px; }
        .gameWrap { flex:0 0 auto; display:flex; flex-direction:column; justify-content:center; align-items:center; min-width:480px; }

        .panel { background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          border:1px solid rgba(0,0,0,.12); border-radius:14px; padding:12px;
          box-shadow:0 8px 30px rgba(0,0,0,.06), inset 0 1px rgba(255,255,255,.15); }
        .title { font-weight:800; margin-bottom:6px; color:#1f2937; }
        .btn { background:#2d2f39; color:#f3f6ff; border:1px solid rgba(255,255,255,.12);
          padding:8px 12px; border-radius:10px; cursor:pointer; font-weight:600; }
        .btn.primary { background:#111827; border-color:#10b981; box-shadow:0 0 0 2px rgba(16,185,129,.2) inset; }
        .btn.success { background:#065f46; border-color:#34d399; }
        .btn[disabled]{ opacity:.55; cursor:not-allowed; }
        .muted { color:#475569; font-weight:700; letter-spacing:.02em; }
        .tiny { font-size:12px; }
        .big { font-size:20px; font-weight:800; color:#0f172a; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; }
        .hint { margin-top:6px; font-size:12px; color:#6b7280; }
        .note { margin-top:8px; background:rgba(255,193,7,.12); border:1px solid rgba(255,193,7,.35);
          color:#7c4a03; padding:10px; border-radius:10px; font-size:13px; }
        .err { color:#b91c1c; }
      `}</style>
    </main>
  );
}

/** Canvas and rendering code (değişmedi) */
function CanvasStage({
  running,
  playerLane,
  playerForward,
  playerCarSrc,
  enemyCarSrcs,
  onTick,
  onLap,
  onCrash,
  bindClearWorld,
}: {
  running: boolean;
  playerLane: number;
  playerForward: number;
  playerCarSrc?: string;
  enemyCarSrcs?: string[];
  onTick: (deltaScore: number) => void;
  onLap: () => void;
  onCrash: () => void;
  bindClearWorld: (fn: () => void) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);
  const stripeOffset = useRef<number>(0);

  const obstacles = useRef<{ lane: number; y: number; spriteIdx: number }[]>([]);
  const timeSinceSpawn = useRef<number>(0);

  const playerImg = useRef<HTMLImageElement | null>(null);
  const enemyImgs = useRef<HTMLImageElement[]>([]);

  const clearWorld = () => {
    obstacles.current = [];
    timeSinceSpawn.current = 0;
    stripeOffset.current = 0;
    last.current = 0;
  };
  useEffect(() => { bindClearWorld(clearWorld); }, [bindClearWorld]);

  useEffect(() => {
    if (playerCarSrc) {
      const img = new Image();
      img.src = playerCarSrc;
      img.onload = () => { playerImg.current = img; draw(); };
      img.onerror = () => { playerImg.current = null; };
    } else playerImg.current = null;

    enemyImgs.current = [];
    (enemyCarSrcs ?? []).forEach((src) => {
      const im = new Image();
      im.src = src;
      im.onload = () => draw();
      enemyImgs.current.push(im);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerCarSrc, JSON.stringify(enemyCarSrcs ?? [])]);

  const BASE_W = 420, BASE_H = 700, ASPECT = BASE_H / BASE_W;

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const resize = () => {
      const parentW = canvas.parentElement?.clientWidth || BASE_W;
      const width = Math.min(440, Math.max(300, parentW));
      const vh = window.innerHeight || 900;
      const targetH = Math.min(Math.max(Math.round(width * ASPECT), 560), Math.max(620, vh - 220));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(targetH * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${targetH}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!running) { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; return; }

    const loop = (now: number) => {
      if (!last.current) last.current = now;
      const dt = (now - last.current) / 1000; last.current = now;

      const roadSpeed = 200;
      const enemySpeed = 165;
      const scoreRate = 120;
      const spawnEvery = 1.1;

      onTick(Math.floor(scoreRate * dt));
      stripeOffset.current = (stripeOffset.current + roadSpeed * dt) % 40;

      timeSinceSpawn.current += dt;
      if (timeSinceSpawn.current > spawnEvery) {
        timeSinceSpawn.current = 0;
        obstacles.current.push({
          lane: Math.floor(Math.random() * 3),
          y: -100,
          spriteIdx: enemyImgs.current.length
            ? Math.floor(Math.random() * enemyImgs.current.length)
            : -1,
        });
      }

      obstacles.current.forEach((o) => (o.y += enemySpeed * dt));

      let passed = 0;
      const h = getH();
      obstacles.current = obstacles.current.filter((o) => {
        if (o.y > h + 120) { passed++; return false; }
        return true;
      });
      for (let i = 0; i < passed; i++) onLap();

      const player = getPlayerRects();
      const hit = obstacles.current.some((o) => {
        const enemy = getEnemyRects(o.lane, o.y);
        return rectsOverlap(
          player.hit.x, player.hit.y, player.hit.w, player.hit.h,
          enemy.hit.x,  enemy.hit.y,  enemy.hit.w,  enemy.hit.h
        );
      });
      if (hit) { onCrash(); last.current = 0; return; }

      draw();
      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; last.current = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, playerLane, playerForward]);

  const dpr = () => Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const getW = () => (ref.current ? ref.current.width / dpr() : BASE_W);
  const getH = () => (ref.current ? ref.current.height / dpr() : BASE_H);
  const padding = 12, laneGap = 10, lanes = 3;
  const getLaneW = () => (getW() - padding * 2 - laneGap * (lanes - 1)) / lanes;

  const HIT_PAD_X = 12;
  const HIT_PAD_Y = 20;

  const getPlayerRects = () => {
    const laneW = getLaneW();
    const w = Math.min(52, laneW - 8);
    const h = 84;
    const baseY = getH() - 78 - h / 2;
    const x = (laneW + laneGap) * playerLane + padding + laneW / 2 - w / 2;
    const y = baseY - playerForward;

    return {
      draw: { x, y, w, h },
      hit:  { x: x + HIT_PAD_X, y: y + HIT_PAD_Y, w: w - HIT_PAD_X * 2, h: h - HIT_PAD_Y * 2 }
    };
  };

  const getEnemyRects = (lane: number, centerY: number) => {
    const laneW = getLaneW();
    const w = Math.min(52, laneW - 8);
    const h = 84;
    const x = (laneW + laneGap) * lane + padding + laneW / 2 - w / 2;
    const y = centerY - h / 2;

    return {
      draw: { x, y, w, h },
      hit:  { x: x + HIT_PAD_X, y: y + HIT_PAD_Y, w: w - HIT_PAD_X * 2, h: h - HIT_PAD_Y * 2 }
    };
  };

  const draw = () => {
    const canvas = ref.current!, ctx = canvas.getContext('2d')!;
    const w = getW(), h = getH();
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#111827');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(6, 6, w - 12, h - 12);

    const laneW = getLaneW();
    for (let i = 0; i < lanes; i++) {
      const x = padding + i * (laneW + laneGap);
      const laneGrad = ctx.createLinearGradient(0, 0, 0, h);
      laneGrad.addColorStop(0, '#1f2937'); laneGrad.addColorStop(1, '#0b1220');
      ctx.fillStyle = laneGrad; ctx.fillRect(x, padding, laneW, h - padding * 2);

      ctx.strokeStyle = 'rgba(16,185,129,.35)'; ctx.lineWidth = 8;
      ctx.strokeRect(x + 4, padding + 4, laneW - 8, h - padding * 2 - 8);

      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 3;
      ctx.setLineDash([14, 14]); ctx.lineDashOffset = -stripeOffset.current;
      ctx.beginPath(); ctx.moveTo(x + laneW / 2, padding + 10);
      ctx.lineTo(x + laneW / 2, h - padding - 10); ctx.stroke();
      ctx.setLineDash([]);
    }

    const p = getPlayerRects();
    if (playerImg.current) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(playerImg.current, p.draw.x, p.draw.y, p.draw.w, p.draw.h);
    } else {
      drawFallbackCar(ctx, p.draw.x, p.draw.y, p.draw.w, p.draw.h);
    }

    obstacles.current.forEach((o) => {
      const e = getEnemyRects(o.lane, o.y);
      const img = enemyImgs.current[o.spriteIdx];
      if (img && img.complete) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, e.draw.x, e.draw.y, e.draw.w, e.draw.h);
      } else {
        drawObstacle(ctx, e.draw.x, e.draw.y, e.draw.w, e.draw.h);
      }
    });

    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
  };

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: 16, overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,.15)', boxShadow: '0 10px 30px rgba(0,0,0,.08)' }}>
      <canvas ref={ref} style={{ display: 'block', width: '100%', height: 720, background: '#0b0f17' }} />
    </div>
  );
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number,
                      bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function drawFallbackCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = 8;
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#22d3ee'); grad.addColorStop(1, '#34d399');
  ctx.fillStyle = grad; roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; roundRect(ctx, x + 6, y + 5, w - 12, 6, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; roundRect(ctx, x + 1, y + 1, w - 2, h - 2, r - 2); ctx.stroke();
  ctx.restore();
}
function drawObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(244,63,94,.9)'; roundRect(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x + 6, y + h / 2); ctx.lineTo(x + w - 6, y + h / 2); ctx.stroke(); ctx.restore();
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
