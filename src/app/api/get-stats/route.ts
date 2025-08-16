// src/app/api/get-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import type { Abi, Address } from 'viem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address | undefined;

const ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'totalScoreOfPlayer',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'totalTransactionsOfPlayer',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'playerDataPerGame',
    inputs: [{ name: 'game', type: 'address' }, { name: 'player', type: 'address' }],
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'transactions', type: 'uint256' },
    ],
  },
] as const satisfies Abi;

function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
}

export async function GET(req: NextRequest) {
  try {
    const playerParam = (req.nextUrl.searchParams.get('player') || '').toLowerCase();
    const player = playerParam as Address;

    if (!isAddress(player) || !isAddress(CONTRACT_ADDRESS)) {
      return NextResponse.json({ ok: false, error: 'bad params' }, { status: 400 });
    }

    // Toplam (tüm oyunlar)
    const [totalScore, totalTxs] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'totalScoreOfPlayer',
        args: [player],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'totalTransactionsOfPlayer',
        args: [player],
      }) as Promise<bigint>,
    ]);

    // Bu oyun: server signer (updatePlayerData gönderen cüzdan)
    const gameAddress = walletClient?.account?.address as Address | undefined;

    let game:
      | { score: string; transactions: string; gameAddress: Address }
      | undefined;

    if (isAddress(gameAddress)) {
      const [perScore, perTxs] = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'playerDataPerGame',
        args: [gameAddress, player],
      })) as readonly [bigint, bigint];

      game = {
        score: perScore.toString(),
        transactions: perTxs.toString(),
        gameAddress,
      };
    }

    return NextResponse.json({
      ok: true,
      total: { score: totalScore.toString(), transactions: totalTxs.toString() },
      game,
    });
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
