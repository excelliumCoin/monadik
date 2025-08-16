// src/app/game/page.tsx
import { Suspense } from 'react';
import GameClient from './GameClient';

export const dynamic = 'force-dynamic';

export default function GamePage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <GameClient />
    </Suspense>
  );
}

function GameSkeleton() {
  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.42)), linear-gradient(180deg, rgba(92,28,168,.08), transparent)',
          border: '1px solid rgba(0,0,0,.1)',
          boxShadow: '0 12px 38px rgba(0,0,0,.12)',
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ height: 24, width: 280, background: 'rgba(0,0,0,.06)', borderRadius: 8 }} />
        <div style={{ marginTop: 10, height: 12, width: 340, background: 'rgba(0,0,0,.05)', borderRadius: 6 }} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 320, height: 180, background: 'rgba(0,0,0,.04)', borderRadius: 12 }} />
        <div style={{ width: 500, height: 720, background: 'rgba(0,0,0,.04)', borderRadius: 12 }} />
        <div style={{ width: 320, height: 180, background: 'rgba(0,0,0,.04)', borderRadius: 12 }} />
      </div>
    </main>
  );
}
