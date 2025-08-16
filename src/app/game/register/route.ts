import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import type { Address, Abi } from 'viem';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address;

const ABI = [
  {
    type: 'function',
    name: 'registerGame',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_game', type: 'address' },
      { name: '_name', type: 'string'  },
      { name: '_image', type: 'string' },
      { name: '_url', type: 'string'   },
    ],
    outputs: [],
  },
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

export async function POST(req: NextRequest) {
  try {
    if (!CONTRACT_ADDRESS) return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    const body = await req.json();
    const name  = String(body.name ?? '').trim();
    const image = String(body.image ?? '').trim();
    const url   = String(body.url ?? '').trim();
    if (!name)  return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

    const gameAddr = walletClient.account!.address as Address;

    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'registerGame',
      args: [gameAddr, name, image, url],
    });

    // doğrulama için ardından oku (opsiyonel)
    const meta = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'games',
      args: [gameAddr],
    });

    return NextResponse.json({ ok: true, tx, meta });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.shortMessage ?? e?.message ?? e) }, { status: 500 });
  }
}
