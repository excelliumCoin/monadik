export const runtime = 'nodejs';        
export const dynamic = 'force-dynamic'; 
import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import { parseAbiItem, type Address } from 'viem';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address;

// Tekil event (viem: getLogs -> "event" ve opsiyonel "args" kullanılır)
const PlayerDataUpdated = parseAbiItem(
  'event PlayerDataUpdated(address indexed game, address indexed player, uint256 indexed scoreAmount, uint256 transactionAmount)'
);

export async function GET(req: NextRequest) {
  try {
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    }

    const url        = new URL(req.url);
    const scope      = (url.searchParams.get('scope') ?? 'game') as 'game' | 'global';
    const limit      = clampInt(url.searchParams.get('limit'), 20, 1, 100);
    const rangeInput = clampInt(url.searchParams.get('range'), 10000, 100, 50000);
    const chunkSize  = clampInt(url.searchParams.get('chunk'), 90, 10, 100);
    const maxChunks  = clampInt(url.searchParams.get('maxChunks'), 200, 1, 2000);
    const withNames  = (url.searchParams.get('withNames') ?? '1').toLowerCase() !== '0';

    // "game" kapsamı için filtrelenecek adres:
    const gameFromQuery = url.searchParams.get('game') as Address | null;
    const serverSigner  = walletClient?.account?.address as Address | undefined;
    const gameAddress   = scope === 'game' ? (gameFromQuery ?? serverSigner ?? null) : null;
    if (scope === 'game' && !gameAddress) {
      return NextResponse.json({ ok: false, error: 'GAME scope requires server signer or ?game=' }, { status: 400 });
    }

    const toBlock = await publicClient.getBlockNumber(); // bigint
    const totalRequested = BigInt(rangeInput);
    const zero = BigInt(0);

    let fromBlock = toBlock > (totalRequested - BigInt(1))
      ? toBlock - (totalRequested - BigInt(1))
      : zero;

    const neededChunks = chunksNeeded(fromBlock, toBlock, BigInt(chunkSize));
    if (neededChunks > maxChunks) {
      const span = BigInt(chunkSize) * BigInt(maxChunks) - BigInt(1);
      fromBlock = toBlock > span ? toBlock - span : zero;
    }

    // Logları RPC limitine takılmadan, gerekirse "game" arg filtresiyle çek
    const logs = await getLogsChunked({
      address: CONTRACT_ADDRESS,
      fromBlock,
      toBlock,
      chunkSize: BigInt(chunkSize),
      args: scope === 'game' ? { game: gameAddress! } : undefined,
    });

    type Acc = { player: Address; score: bigint; transactions: bigint };
    const map = new Map<string, Acc>();

    for (const log of logs) {
      const { args } = log as unknown as {
        args: {
          game: Address;
          player: Address;
          scoreAmount: bigint;
          transactionAmount: bigint;
        };
      };
      const key = (args.player as string).toLowerCase();
      const prev = map.get(key) ?? { player: args.player, score: BigInt(0), transactions: BigInt(0) };
      prev.score        = prev.score        + (args.scoreAmount ?? BigInt(0));
      prev.transactions = prev.transactions + (args.transactionAmount ?? BigInt(0));
      map.set(key, prev);
    }

    const top = Array.from(map.values())
      .sort((a, b) => {
        if (a.score !== b.score) return a.score < b.score ? 1 : -1;
        if (a.transactions !== b.transactions) return a.transactions < b.transactions ? 1 : -1;
        return 0;
      })
      .slice(0, limit);

    // İlk N için username çöz (adres→kullanıcı adı)
    let nameMap: Map<string, string | null> = new Map();
    if (withNames && top.length > 0) {
      const uniq = Array.from(new Set(top.map(r => (r.player as string).toLowerCase())));
      nameMap = await resolveUsernames(uniq, 6);
    }

    const rows = top.map((r) => ({
      player: r.player,
      username: nameMap.get((r.player as string).toLowerCase()) ?? null,
      score: r.score.toString(),
      transactions: r.transactions.toString(),
    }));

    return NextResponse.json({
      ok: true,
      scope,
      gameAddress: gameAddress ?? null,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      chunkSize,
      rowsCount: rows.length,
      rows,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

/** RPC limitine takılmadan parça parça getLogs */
async function getLogsChunked(opts: {
  address: Address;
  fromBlock: bigint;
  toBlock: bigint;
  chunkSize: bigint;
  args?: { game?: Address; player?: Address }; // sadece ihtiyacımız olan arg
}) {
  const { address, fromBlock, toBlock, chunkSize, args } = opts;
  const out: any[] = [];
  let start = fromBlock;

  while (start <= toBlock) {
    const end = start + chunkSize > toBlock ? toBlock : start + chunkSize;
    const logs = await publicClient.getLogs({
      address,
      event: PlayerDataUpdated,
      fromBlock: start,
      toBlock: end,
      ...(args ? { args } : {}), // scope=game ise topic filtresi uygula
    });
    out.push(...logs);
    start = end + BigInt(1);
  }
  return out;
}

/** Adresler için kullanıcı adlarını çözer (basit cache + küçük concurrency) */
const nameCache = new Map<string, string | null>();
async function resolveUsernames(addresses: string[], concurrency = 6) {
  const out = new Map<string, string | null>();
  let i = 0;
  const worker = async () => {
    while (i < addresses.length) {
      const idx = i++;
      const addr = addresses[idx].toLowerCase();
      if (nameCache.has(addr)) {
        out.set(addr, nameCache.get(addr)!);
        continue;
      }
      const name = await fetchUsername(addr);
      nameCache.set(addr, name);
      out.set(addr, name);
      await sleep(10);
    }
  };
  const n = Math.min(Math.max(concurrency, 1), 10);
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

async function fetchUsername(wallet: string): Promise<string | null> {
  try {
    const u = `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}&t=${Date.now()}`;
    const r = await fetch(u, { cache: 'no-store' });
    if (!r.ok) return null;
    const data: any = await r.json().catch(() => ({}));
    const username =
      data?.username ??
      data?.handle ??
      (typeof data?.user?.username === 'string' ? data.user.username : undefined);

    const hasUsername =
      Boolean(data?.hasUsername) ||
      Boolean(data?.exists) ||
      Boolean(username && String(username).trim().length > 0);

    return hasUsername ? String(username) : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v ?? def);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(Math.trunc(n), max));
}

function chunksNeeded(fromBlock: bigint, toBlock: bigint, chunkSize: bigint) {
  const total = toBlock >= fromBlock ? (toBlock - fromBlock + BigInt(1)) : BigInt(0);
  return Number((total + chunkSize - BigInt(1)) / chunkSize);
}
