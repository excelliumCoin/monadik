// src/app/game/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import { parseAbi, type Address, type Hash } from 'viem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address | undefined;

const ABI = parseAbi([
  'function registerGame(address _game, string _name, string _image, string _url)',
  'function games(address) view returns (address game,string image,string name,string url)',
]);

type RegisterBody = {
  name?: string;
  image?: string;
  url?: string;
};

function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
}

export async function GET() {
  try {
    if (!isAddress(CONTRACT_ADDRESS)) {
      return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    }
    const game = walletClient?.account?.address as Address | undefined;
    if (!isAddress(game)) {
      return NextResponse.json({ ok: false, error: 'server signer missing' }, { status: 500 });
    }

    const info = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'games',
      args: [game],
    })) as readonly [Address, string, string, string];

    const [addr, image, name, url] = info;
    const registered = addr && addr.toLowerCase() === game.toLowerCase();

    return NextResponse.json({
      ok: true,
      registered,
      game,
      meta: { name, image, url },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAddress(CONTRACT_ADDRESS)) {
      return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    }
    const game = walletClient?.account?.address as Address | undefined;
    if (!isAddress(game)) {
      return NextResponse.json({ ok: false, error: 'server signer missing' }, { status: 500 });
    }

    const body: RegisterBody = await req.json().catch(() => ({} as RegisterBody));
    const name = (body.name ?? process.env.GAME_NAME ?? 'Monad Racer').toString();
    const image = (body.image ?? process.env.GAME_IMAGE ?? '').toString();
    const url = (body.url ?? process.env.GAME_URL ?? '').toString();

    const tx: Hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'registerGame',
      args: [game, name, image, url],
    });

    return NextResponse.json({ ok: true, tx, game, name, image, url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
