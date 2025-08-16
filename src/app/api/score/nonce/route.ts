import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

/**
 * Not: Demo için bellek içi store kullanıyoruz.
 * Prod'da Redis/KV gibi kalıcı bir store kullanın.
 */
type NonceRec = { wallet: `0x${string}`; nonce: string; issuedAt: number; used?: boolean; ttlMs: number };
const globalAny = global as any;
globalAny.__NONCES__ ||= new Map<string, NonceRec>();
const NONCES: Map<string, NonceRec> = globalAny.__NONCES__;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const wallet = url.searchParams.get('wallet') as `0x${string}` | null;
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ ok: false, error: 'bad wallet' }, { status: 400 });
    }

    const nonce = crypto.randomBytes(16).toString('hex'); // 32 char
    const issuedAt = Date.now();
    const ttlMs = 2 * 60 * 1000; // 2 dk geçerli

    const rec: NonceRec = { wallet, nonce, issuedAt, ttlMs };
    NONCES.set(nonce, rec);

    // Oyuncu bu metni EIP-191 ile imzalayacak
    const message =
`Monad Racer Score Authorization
wallet=${wallet}
nonce=${nonce}
issuedAt=${issuedAt}`;

    return NextResponse.json({ ok: true, wallet, nonce, issuedAt, ttlMs, message });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
