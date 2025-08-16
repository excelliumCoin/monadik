import { NextRequest, NextResponse } from 'next/server';
import { walletClient } from '@/lib/viem';
import { parseAbi, type Address, type Hash } from 'viem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address | undefined;

const ABI = parseAbi([
  'function updatePlayerData(address player, uint256 scoreAmount, uint256 transactionAmount)',
]);

function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
}

type Body = {
  player?: string;
  scoreAmount?: number;
  transactionAmount?: number;
};

export async function POST(req: NextRequest) {
  try {
    if (!isAddress(CONTRACT_ADDRESS)) {
      return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    }
    const game = walletClient?.account?.address as Address | undefined;
    if (!isAddress(game)) {
      return NextResponse.json({ ok: false, error: 'server signer missing' }, { status: 500 });
    }

    const body: Body = await req.json().catch(() => ({} as Body));
    const player = (body.player || '').toLowerCase() as Address;
    const scoreAmount = Number(body.scoreAmount ?? 0);
    const transactionAmount = Number(body.transactionAmount ?? 0);

    if (!isAddress(player)) {
      return NextResponse.json({ ok: false, error: 'bad player' }, { status: 400 });
    }

    const tx: Hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'updatePlayerData',
      args: [player, BigInt(Math.max(0, Math.trunc(scoreAmount))), BigInt(Math.max(0, Math.trunc(transactionAmount)))],
    });

    return NextResponse.json({ ok: true, tx });
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
