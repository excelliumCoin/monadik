// src/app/game/status/route.ts
import { NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import type { Address } from 'viem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address | undefined;

function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
}

export async function GET() {
  try {
    const signer = walletClient?.account?.address as Address | undefined;
    const okSigner = isAddress(signer);
    const okContract = isAddress(CONTRACT_ADDRESS);

    const head = await publicClient.getBlockNumber();

    return NextResponse.json({
      ok: true,
      signer: okSigner ? signer : null,
      contract: okContract ? CONTRACT_ADDRESS : null,
      latestBlock: head.toString(),
      ready: okSigner && okContract,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
