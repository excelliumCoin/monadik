export const runtime = 'nodejs';        
export const dynamic = 'force-dynamic'; 
import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem';
import { parseAbiItem, type Address } from 'viem';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address;

const PlayerDataUpdated = parseAbiItem(
  'event PlayerDataUpdated(address indexed game, address indexed player, uint256 indexed scoreAmount, uint256 transactionAmount)'
);

export async function GET(req: NextRequest) {
  try {
    if (!CONTRACT_ADDRESS) return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });

    const url = new URL(req.url);
    const player = url.searchParams.get('player') as `0x${string}` | null;
    if (!player || !/^0x[a-fA-F0-9]{40}$/.test(player)) {
      return NextResponse.json({ ok: false, error: 'bad player' }, { status: 400 });
    }

    const limit      = clampInt(url.searchParams.get('limit'), 20, 1, 100);
    const rangeInput = clampInt(url.searchParams.get('range'), 8000, 100, 50000);
    const chunkSize  = clampInt(url.searchParams.get('chunk'), 90, 10, 100);
    const toBlock    = await publicClient.getBlockNumber();
    const zero       = BigInt(0);

    let fromBlock = toBlock > (BigInt(rangeInput) - BigInt(1))
      ? toBlock - (BigInt(rangeInput) - BigInt(1))
      : zero;

    // parça parça çek
    const logs: any[] = [];
    let start = fromBlock;
    while (start <= toBlock) {
      const end = start + BigInt(chunkSize) > toBlock ? toBlock : start + BigInt(chunkSize);
      const part = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: PlayerDataUpdated,
        fromBlock: start,
        toBlock: end,
        args: { player },
      });
      logs.push(...part);
      start = end + BigInt(1);
    }

    // yeni → eski
    logs.sort((a, b) => (a.blockNumber < b.blockNumber ? 1 : -1));

    const rows = logs.slice(0, limit).map(l => ({
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash as string,
      game: (l.args as any).game as string,
      player: (l.args as any).player as string,
      scoreAmount: ((l.args as any).scoreAmount as bigint).toString(),
      transactionAmount: ((l.args as any).transactionAmount as bigint).toString(),
    }));

    return NextResponse.json({ ok: true, fromBlock: fromBlock.toString(), toBlock: toBlock.toString(), rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v ?? def);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(Math.trunc(n), max));
}
