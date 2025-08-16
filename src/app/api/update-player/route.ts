export const runtime = 'nodejs';        
export const dynamic = 'force-dynamic'; 
import { NextRequest, NextResponse } from 'next/server';
import { publicClient, walletClient } from '@/lib/viem';
import type { Address, Abi } from 'viem';

const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS ??
  '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4') as Address;

const ABI = [
  {
    type: 'function',
    name: 'updatePlayerData',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'scoreAmount', type: 'uint256' },
      { name: 'transactionAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  { type: 'function', name: 'GAME_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
] as const satisfies Abi;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const player = String(body.player ?? '') as `0x${string}`;
    const scoreAmount = BigInt(body.scoreAmount ?? 0);
    const transactionAmount = BigInt(body.transactionAmount ?? 0);

    if (!/^0x[a-fA-F0-9]{40}$/.test(player)) {
      return NextResponse.json({ ok: false, error: 'bad player address' }, { status: 400 });
    }
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'CONTRACT_ADDRESS missing' }, { status: 500 });
    }

    // server signer GAME_ROLE kontrolü
    const gameRole = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'GAME_ROLE',
    });
    const sender = walletClient.account!.address;
    const has = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'hasRole',
      args: [gameRole, sender],
    });
    if (!has) {
      return NextResponse.json({ ok: false, error: `Server signer has no GAME_ROLE (${sender})` }, { status: 403 });
    }

    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'updatePlayerData',
      args: [player, scoreAmount, transactionAmount],
    });

    return NextResponse.json({ ok: true, tx });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.shortMessage ?? e?.message ?? e) }, { status: 500 });
  }
}
