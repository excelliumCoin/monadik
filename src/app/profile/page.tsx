// src/app/profile/page.tsx
import { Suspense } from 'react';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileClient />
    </Suspense>
  );
}

function ProfileSkeleton() {
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
        }}
      >
        <div style={{ height: 20, width: 220, background: 'rgba(0,0,0,.06)', borderRadius: 8 }} />
        <div style={{ marginTop: 12, height: 12, width: 320, background: 'rgba(0,0,0,.05)', borderRadius: 6 }} />
      </div>

      <div
        style={{
          marginTop: 12,
          background:
            'linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.42)), linear-gradient(180deg, rgba(92,28,168,.08), transparent)',
          border: '1px solid rgba(0,0,0,.1)',
          boxShadow: '0 12px 38px rgba(0,0,0,.12)',
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ height: 160, background: 'rgba(0,0,0,.04)', borderRadius: 12 }} />
      </div>
    </main>
  );
}
