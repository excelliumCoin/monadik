// src/app/api/check-username/route.ts
import { NextRequest, NextResponse } from 'next/server';

type Upstream =
  | { ok?: boolean; hasUsername?: boolean; username?: string }
  | { exists?: boolean; handle?: string }
  | any;

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json(
      { ok: false, hasUsername: false, error: 'wallet required' },
      { status: 400 }
    );
  }

  // Upstream’i cache’ten okumaması için “t” paramı ekliyoruz
  const url = `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}&t=${Date.now()}`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      // Yukarıdaki servis 404/500 vs dönebilir → username yok gibi davran
      return NextResponse.json({ ok: true, hasUsername: false });
    }

    const data: Upstream = await r.json().catch(() => ({}));

    // Olası şekilleri normalize et
    const username =
      data?.username ??
      data?.handle ??
      (typeof data?.user?.username === 'string' ? data.user.username : undefined);

    const hasUsername =
      Boolean(data?.hasUsername) ||
      Boolean(data?.exists) ||
      Boolean(username && String(username).trim().length > 0);

    return NextResponse.json({ ok: true, hasUsername, username });
  } catch (e: any) {
    // Ağ hatasında bile “username yok” varsay → modal açılsın
    return NextResponse.json(
      { ok: false, hasUsername: false, error: String(e?.message ?? e) },
      { status: 200 }
    );
  }
}
