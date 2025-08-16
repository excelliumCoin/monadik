// src/app/api/score/nonce/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Demo için bellek içi store. Prod'da Redis/KV önerilir.
 */
type NonceRec = {
  wallet: `0x${string}`;
  nonce: string;
  issuedAt: number;
  ttlMs: number;
  used?: boolean;
};

/** globalThis için tip genişletme (HMR/Serverless instance başına paylaşımlı bellek) */
declare global {
  var __NONCES__: Map<string, NonceRec> | undefined;
}

/** İlk yüklemede Map'i oluştur */
if (!globalThis.__NONCES__) {
  globalThis.__NONCES__ = new Map<string, NonceRec>();
}
const NONCES = globalThis.__NONCES__!;

function isAddress(v: unknown): v is `0x${string}` {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
}

/** Basit temizlik: süresi dolan kayıtları sil */
function sweepExpired(now = Date.now()) {
  for (const [k, rec] of NONCES) {
    if (now - rec.issuedAt > rec.ttlMs) NONCES.delete(k);
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const walletParam = url.searchParams.get('wallet');
    const wallet = (walletParam || '').toLowerCase() as `0x${string}`;

    if (!isAddress(wallet)) {
      return NextResponse.json({ ok: false, error: 'bad wallet' }, { status: 400 });
    }

    // Süresi dolanları arada temizle
    sweepExpired();

    const nonce = crypto.randomBytes(16).toString('hex'); // 32 karakter
    const issuedAt = Date.now();
    const ttlMs = 2 * 60 * 1000; // 2 dk

    const rec: NonceRec = { wallet, nonce, issuedAt, ttlMs };
    NONCES.set(nonce, rec);

    // Oyuncunun EIP-191 ile imzalayacağı mesaj (örnek)
    const message =
`Monad Racer Score Authorization
wallet=${wallet}
nonce=${nonce}
issuedAt=${issuedAt}`;

    return NextResponse.json({ ok: true, wallet, nonce, issuedAt, ttlMs, message });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
