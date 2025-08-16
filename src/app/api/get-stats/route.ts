import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import { Abi } from 'viem';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

const ABI = [
  {
    "type": "function", "stateMutability": "view", "name": "totalScoreOfPlayer",
    "inputs": [{"name":"player","type":"address"}], "outputs":[{"type":"uint256"}]
  },
  {
    "type": "function", "stateMutability": "view", "name": "totalTransactionsOfPlayer",
    "inputs": [{"name":"player","type":"address"}], "outputs":[{"type":"uint256"}]
  },
  {
    "type": "function", "stateMutability": "view", "name": "playerDataPerGame",
    "inputs": [{"type":"address"},{"type":"address"}],
    "outputs":[{"name":"score","type":"uint256"},{"name":"transactions","type":"uint256"}]
  },
] as const satisfies Abi;

export async function GET(req: NextRequest) {
  try {
    const player = req.nextUrl.searchParams.get('player') as `0x${string}` | null;
    if (!player || !CONTRACT_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'bad params' }, { status: 400 });
    }

    const [totalScore, totalTxs] = await Promise.all([
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalScoreOfPlayer', args: [player] }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalTransactionsOfPlayer', args: [player] }),
    ]);

    // Bu oyun (server signer adresi, yani updatePlayerData gönderen "game")
    const gameAddress = walletClient.account!.address;
    const [perScore, perTxs] = await publicClient.readContract({
      address: CONTRACT_ADDRESS, abi: ABI, functionName: 'playerDataPerGame', args: [gameAddress, player],
    }) as [bigint, bigint];

    return NextResponse.json({
      ok: true,
      total: { score: totalScore.toString(), transactions: totalTxs.toString() },
      game:  { score: perScore.toString(), transactions: perTxs.toString(), gameAddress },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.shortMessage ?? e?.message ?? e) }, { status: 500 });
  }
}
