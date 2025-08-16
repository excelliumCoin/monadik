// src/app/api/score/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage, isHex, type Address } from 'viem';
import { publicClient, walletClient } from '@/lib/viem';

/** Bellek içi nonce store (nonce route ile ortaktır) */
type NonceRec = { wallet: `0x${string}`; nonce: string; issuedAt: number; used?: boolean; ttlMs: number };
const globalAny = global as any;
globalAny.__NONCES__ ||= new Map<string, NonceRec>();
const NONCES: Map<string, NonceRec> = globalAny.__NONCES__;

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

// Minimal ABI
const ABI = [
  {
    type: 'function',
    name: 'updatePlayerData',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'scoreAmount', type: 'uint256' },
      { name: 'transactionAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  { type: 'function', name: 'GAME_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'hasRole',  stateMutability: 'view', inputs: [{ type:'bytes32'},{ type:'address'}], outputs: [{ type:'bool'}] },
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- Tip güvenli parse & doğrulama ---
    const walletStr = String(body.wallet ?? '');
    const score     = BigInt(body.scoreAmount ?? 0);
    const txCount   = BigInt(body.transactionAmount ?? 0);
    const nonce     = String(body.nonce ?? '');
    const message   = String(body.message ?? '');
    const sigStr    = String(body.signature ?? '');
    const msPlayed  = Number(body.msPlayed ?? 0);

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletStr)) {
      return NextResponse.json({ ok: false, error: 'bad wallet' }, { status: 400 });
    }
    if (!nonce || !message || !sigStr) {
      return NextResponse.json({ ok: false, error: 'missing nonce/signature' }, { status: 400 });
    }
    if (!isHex(sigStr)) {
      return NextResponse.json({ ok: false, error: 'signature must be 0x-hex' }, { status: 400 });
    }

    // Narrow tipler (TS için)
    const wallet = walletStr.toLowerCase() as `0x${string}`;
    const signature = sigStr as `0x${string}`;

    // 1) Nonce doğrula
    const rec = NONCES.get(nonce);
    if (!rec) return NextResponse.json({ ok: false, error: 'nonce not found' }, { status: 400 });
    if (rec.used) return NextResponse.json({ ok: false, error: 'nonce already used' }, { status: 400 });
    if (rec.wallet.toLowerCase() !== wallet) return NextResponse.json({ ok: false, error: 'nonce wallet mismatch' }, { status: 400 });
    if (Date.now() > rec.issuedAt + rec.ttlMs) return NextResponse.json({ ok: false, error: 'nonce expired' }, { status: 400 });

    // 2) İmzayı doğrula (EIP-191 personal_sign)
    const ok = await verifyMessage({
      address: wallet as Address,      // Address tipine daralt
      message,
      signature,                       // `0x${string}` tipinde
    });
    if (!ok) return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 400 });

    // 3) Basit anti-cheat
    const minMs = 2000; // 2 sn altını engelle
    const secs = Math.max((msPlayed > 0 ? msPlayed : Date.now() - rec.issuedAt) / 1000, 0.001);
    const maxScore = Math.max(200 * secs, 300); // ~100 puan/sn oyun → tolerans 200 puan/sn
    if (score > BigInt(Math.floor(maxScore))) {
      return NextResponse.json({ ok: false, error: 'unreasonable score' }, { status: 400 });
    }
    if (msPlayed > 0 && msPlayed < minMs) {
      return NextResponse.json({ ok: false, error: 'too short session' }, { status: 400 });
    }

    // 4) Server signer GAME_ROLE kontrolü
    const gameRole = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'GAME_ROLE',
    });
    const sender = walletClient.account!.address;
    const has = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'hasRole',
      args: [gameRole, sender],
    });
    if (!has) {
      return NextResponse.json({ ok: false, error: `Server signer has no GAME_ROLE (${sender})` }, { status: 403 });
    }

    // 5) Zincire yaz
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'updatePlayerData',
      args: [wallet, score, txCount],
    });

    // 6) Nonce tek kullanımlık
    rec.used = true;
    NONCES.set(nonce, rec);

    return NextResponse.json({ ok: true, tx: hash });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.shortMessage ?? e?.message ?? e) }, { status: 500 });
  }
}
