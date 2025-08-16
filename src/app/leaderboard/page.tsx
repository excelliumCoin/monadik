// src/app/leaderboard/page.tsx
import { Suspense } from 'react';
import LeaderboardClient from './LeaderboardClient';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LbSkeleton />}>
      <LeaderboardClient />
    </Suspense>
  );
}

function LbSkeleton() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
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
        <div style={{ height: 22, width: 240, background: 'rgba(0,0,0,.06)', borderRadius: 8 }} />
        <div style={{ marginTop: 10, height: 12, width: 320, background: 'rgba(0,0,0,.05)', borderRadius: 6 }} />
      </div>
      <div
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.42)), linear-gradient(180deg, rgba(92,28,168,.08), transparent)',
          border: '1px solid rgba(0,0,0,.1)',
          boxShadow: '0 12px 38px rgba(0,0,0,.12)',
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ height: 200, background: 'rgba(0,0,0,.04)', borderRadius: 12 }} />
      </div>
    </main>
  );
}
