import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import type { Address, Abi } from 'viem';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address;

const ABI = [
  {
    type: 'function',
    name: 'games',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'game',  type: 'address' },
      { name: 'image', type: 'string'  },
      { name: 'name',  type: 'string'  },
      { name: 'url',   type: 'string'  },
    ],
  },
] as const satisfies Abi;

export async function GET(_: NextRequest) {
  try {
    if (!CONTRACT_ADDRESS) return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });

    const gameAddr = walletClient.account!.address as Address; // server signer = bu oyunun “game” adresi
    const res = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'games',
      args: [gameAddr],
    }) as unknown as { game: Address; image: string; name: string; url: string };

    const registered = !!res?.game && res.game.toLowerCase() === gameAddr.toLowerCase() && !!res.name;
    return NextResponse.json({ ok: true, registered, gameAddress: gameAddr, meta: res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
