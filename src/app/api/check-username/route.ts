// src/app/api/check-username/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Upstream dönen objeden username/handle’ı güvenli biçimde seç */
function pickUsername(obj: unknown): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const o = obj as Record<string, unknown>;

  const directUser =
    typeof o.username === 'string' ? o.username :
    typeof o.handle === 'string'   ? o.handle   :
    undefined;

  if (directUser && directUser.trim()) return directUser.trim();

  const user = o.user;
  if (typeof user === 'object' && user !== null) {
    const u = user as Record<string, unknown>;
    const nested =
      typeof u.username === 'string' ? u.username :
      typeof u.handle === 'string'   ? u.handle   :
      undefined;
    if (nested && nested.trim()) return nested.trim();
  }
  return undefined;
}

/** Upstream’in “hasUsername/exists” bayraklarını güvenli okur */
function pickHasUsername(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const hv =
    (typeof o.hasUsername === 'boolean' && o.hasUsername) ||
    (typeof o.exists === 'boolean' && o.exists);
  return Boolean(hv);
}

export async function GET(req: NextRequest) {
  const wallet = (req.nextUrl.searchParams.get('wallet') || '').toLowerCase();

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json(
      { ok: false, hasUsername: false, error: 'wallet required or invalid' },
      { status: 400 }
    );
  }

  // Upstream’i cache’ten okumaması için “t” paramı
  const url = `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}&t=${Date.now()}`;

  try {
    const r = await fetch(url, { cache: 'no-store' });

    // Upstream 404/500 dönerse: username yok gibi davran
    if (!r.ok) {
      return NextResponse.json({ ok: true, hasUsername: false });
    }

    const data: unknown = await r.json().catch(() => ({}));
    const username = pickUsername(data);
    const hasUsername = pickHasUsername(data) || Boolean(username);

    return NextResponse.json({ ok: true, hasUsername, username });
  } catch (e) {
    // Ağ hatası durumunda bile modal’ın açılması için 200’le “yok” varsay
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'fetch_failed';
    return NextResponse.json(
      { ok: false, hasUsername: false, error: msg },
      { status: 200 }
    );
  }
}
