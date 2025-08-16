// src/app/api/player/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem';
import { parseAbiItem, type Address } from 'viem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address | undefined;

const PlayerDataUpdated = parseAbiItem(
  'event PlayerDataUpdated(address indexed game, address indexed player, uint256 indexed scoreAmount, uint256 transactionAmount)'
);

type EventArgs = {
  game: Address;
  player: Address;
  scoreAmount: bigint;
  transactionAmount: bigint;
};

type LogWithArgs = {
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  args: EventArgs;
};

function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
}

export async function GET(req: NextRequest) {
  try {
    if (!isAddress(CONTRACT_ADDRESS)) {
      return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    }

    const url = new URL(req.url);
    const playerParam = (url.searchParams.get('player') || '').toLowerCase();
    const player = playerParam as Address;

    if (!isAddress(player)) {
      return NextResponse.json({ ok: false, error: 'bad player' }, { status: 400 });
    }

    const limit = clampInt(url.searchParams.get('limit'), 20, 1, 100);
    const rangeInput = clampInt(url.searchParams.get('range'), 8000, 100, 50_000);
    const chunkSize = clampInt(url.searchParams.get('chunk'), 90, 10, 100);

    const toBlock = await publicClient.getBlockNumber(); // bigint
    const zero = 0n;

    const fromBlock =
      toBlock > BigInt(rangeInput) - 1n ? toBlock - (BigInt(rangeInput) - 1n) : zero;

    // Parça parça log çek
    const logs: LogWithArgs[] = [];
    let start = fromBlock;
    const step = BigInt(chunkSize);

    while (start <= toBlock) {
      const end = start + step > toBlock ? toBlock : start + step;
      const part = (await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: PlayerDataUpdated,
        fromBlock: start,
        toBlock: end,
        args: { player },
      })) as LogWithArgs[];
      logs.push(...part);
      start = end + 1n;
    }

    // yeni → eski
    logs.sort((a, b) => {
      const ab = a.blockNumber ?? 0n;
      const bb = b.blockNumber ?? 0n;
      return ab < bb ? 1 : ab > bb ? -1 : 0;
    });

    const rows = logs.slice(0, limit).map((l) => ({
      blockNumber: String(l.blockNumber ?? 0n),
      txHash: (l.transactionHash ?? '0x') as `0x${string}`,
      game: l.args.game as string,
      player: l.args.player as string,
      scoreAmount: (l.args.scoreAmount ?? 0n).toString(),
      transactionAmount: (l.args.transactionAmount ?? 0n).toString(),
    }));

    return NextResponse.json({
      ok: true,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      rows,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v ?? def);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(Math.trunc(n), max));
}
