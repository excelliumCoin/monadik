// src/app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import { parseAbiItem, type Address } from 'viem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address | undefined;

// Tekil event (viem: getLogs -> "event" ve opsiyonel "args" kullanılır)
const PlayerDataUpdated = parseAbiItem(
  'event PlayerDataUpdated(address indexed game, address indexed player, uint256 indexed scoreAmount, uint256 transactionAmount)'
);

type Scope = 'game' | 'global';

type Acc = { player: Address; score: bigint; transactions: bigint };
type RowOut = {
  player: Address;
  username: string | null;
  score: string;
  transactions: string;
};

type EventArgs = {
  game: Address;
  player: Address;
  scoreAmount: bigint;
  transactionAmount: bigint;
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
    const scope = ((url.searchParams.get('scope') ?? 'game') === 'global' ? 'global' : 'game') as Scope;

    const limit = clampInt(url.searchParams.get('limit'), 20, 1, 100);
    const rangeInput = clampInt(url.searchParams.get('range'), 10_000, 100, 50_000);
    const chunkSize = clampInt(url.searchParams.get('chunk'), 90, 10, 100);
    const maxChunks = clampInt(url.searchParams.get('maxChunks'), 200, 1, 2_000);
    const withNames = (url.searchParams.get('withNames') ?? '1').toLowerCase() !== '0';

    // "game" kapsamı için filtrelenecek adres
    const qGame = url.searchParams.get('game');
    const gameFromQuery = isAddress(qGame) ? (qGame as Address) : undefined;
    const serverSigner = walletClient?.account?.address as Address | undefined;
    const gameAddress = scope === 'game' ? (gameFromQuery ?? serverSigner) : undefined;

    if (scope === 'game' && !isAddress(gameAddress)) {
      return NextResponse.json(
        { ok: false, error: 'GAME scope requires server signer or ?game=' },
        { status: 400 }
      );
    }

    const toBlock = await publicClient.getBlockNumber(); // bigint
    const totalRequested = BigInt(rangeInput);
    const zero = 0n;

    let fromBlock =
      toBlock > (totalRequested - 1n) ? toBlock - (totalRequested - 1n) : zero;

    const needed = chunksNeeded(fromBlock, toBlock, BigInt(chunkSize));
    if (needed > maxChunks) {
      const span = BigInt(chunkSize) * BigInt(maxChunks) - 1n;
      fromBlock = toBlock > span ? toBlock - span : zero;
    }

    // Logları parça parça çek (scope=game ise event arg filtresi uygula)
    const logs = await getLogsChunked({
      address: CONTRACT_ADDRESS,
      fromBlock,
      toBlock,
      chunkSize: BigInt(chunkSize),
      args: scope === 'game' ? { game: gameAddress as Address } : undefined,
    });

    const map = new Map<string, Acc>();

    for (const log of logs) {
      const { game, player, scoreAmount, transactionAmount } = log.args;
      // Eğer scope=game ise temkinli olun (theoretical double-check)
      if (scope === 'game' && gameAddress && game.toLowerCase() !== gameAddress.toLowerCase()) {
        continue;
      }
      const key = (player as string).toLowerCase();
      const prev = map.get(key) ?? { player, score: 0n, transactions: 0n };
      map.set(key, {
        player,
        score: prev.score + (scoreAmount ?? 0n),
        transactions: prev.transactions + (transactionAmount ?? 0n),
      });
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
      const uniq = Array.from(new Set(top.map((r) => (r.player as string).toLowerCase())));
      nameMap = await resolveUsernames(uniq, 6);
    }

    const rows: RowOut[] = top.map((r) => ({
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** RPC limitine takılmadan parça parça getLogs */
async function getLogsChunked(opts: {
  address: Address;
  fromBlock: bigint;
  toBlock: bigint;
  chunkSize: bigint;
  args?: { game?: Address; player?: Address }; // sadece ihtiyacımız olan arg
}): Promise<Array<{ args: EventArgs }>> {
  const { address, fromBlock, toBlock, chunkSize, args } = opts;
  const out: Array<{ args: EventArgs }> = [];
  let start = fromBlock;

  while (start <= toBlock) {
    const end = start + chunkSize > toBlock ? toBlock : start + chunkSize;
    const logs = await publicClient.getLogs({
      address,
      event: PlayerDataUpdated,
      fromBlock: start,
      toBlock: end,
      ...(args ? { args } : {}),
    });
    // logs, viem sayesinde { args } içerir; EventArgs ile uyumludur
    for (const l of logs as Array<{ args: EventArgs }>) out.push(l);
    start = end + 1n;
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
    const data: unknown = await r.json().catch(() => ({}));

    const username = pickUsername(data);
    const has = pickHasUsername(data) || Boolean(username);
    return has && username ? username : null;
  } catch {
    return null;
  }
}

/** Upstream dönen objeden username/handle’ı güvenli biçimde seç */
function pickUsername(obj: unknown): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const o = obj as Record<string, unknown>;

  const direct =
    typeof o.username === 'string' ? o.username :
    typeof o.handle === 'string'   ? o.handle   :
    undefined;
  if (direct && direct.trim()) return direct.trim();

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v ?? def);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(Math.trunc(n), max));
}

function chunksNeeded(fromBlock: bigint, toBlock: bigint, chunkSize: bigint) {
  const total = toBlock >= fromBlock ? toBlock - fromBlock + 1n : 0n;
  return Number((total + chunkSize - 1n) / chunkSize);
}
