import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json(
        { error: 'Claim ID is required' },
        { status: 400 }
      );
    }

    // 1. Find the claim
    const claim = await db.vaultClaim.findUnique({
      where: { id: claimId },
      include: {
        user: { select: { id: true, email: true } },
        claimant: { select: { id: true, email: true } },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // 2. Authorize: only the owner of the vault or an admin can cancel a claim
    if (session.role !== 'admin' && claim.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the vault owner can cancel a claim' },
        { status: 403 }
      );
    }

    // 3. Update the claim status
    const updatedClaim = await db.vaultClaim.update({
      where: { id: claimId },
      data: { status: 'cancelled' },
    });

    // 4. Log audit details
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || null;
    
    await db.auditLog.create({
      data: {
        userId: claim.userId,
        action: 'claim_cancelled',
        details: `Vault owner ${claim.user.email} cancelled the claim filed by ${claim.claimant.email}. Proof of life confirmed.`,
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      message: 'Claim cancelled successfully. Proof of life recorded.',
      claim: updatedClaim,
    });
  } catch (error) {
    console.error('Claim Cancel API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
