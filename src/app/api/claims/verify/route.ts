import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { claimId, action } = await req.json(); // action: 'approve' | 'reject'

    if (!claimId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Claim ID and valid action (approve/reject) are required' },
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

    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: `Claim has already been resolved with status: ${claim.status}` },
        { status: 400 }
      );
    }

    // 2. Authorize: user must be an admin, or a designated trustee for this vault owner
    let authorized = false;
    let roleName = 'Trustee';

    if (session.role === 'admin') {
      authorized = true;
      roleName = 'Administrator';
    } else {
      const trusteeRecord = await db.trustee.findFirst({
        where: {
          ownerId: claim.userId,
          email: session.email.toLowerCase(),
        },
      });

      if (trusteeRecord) {
        authorized = true;
        roleName = trusteeRecord.role || 'Trustee';
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized: You are not a designated trustee or administrator for this vault.' },
        { status: 403 }
      );
    }

    // 3. Update the claim status
    const status = action === 'approve' ? 'approved' : 'cancelled';
    const updatedClaim = await db.vaultClaim.update({
      where: { id: claimId },
      data: { status },
    });

    // 4. Log audit log
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || null;
    await db.auditLog.create({
      data: {
        userId: claim.userId,
        action: action === 'approve' ? 'claim_approved' : 'claim_rejected',
        details: `Vault claim filed by ${claim.claimant.email} was ${action}d by ${session.email} (${roleName}).`,
        ipAddress: ip,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: action === 'approve' ? 'claim_approved' : 'claim_rejected',
        details: `Approved/rejected claim for owner ${claim.user.email} filed by claimant ${claim.claimant.email}.`,
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      message: `Claim successfully ${action}d.`,
      claim: updatedClaim,
    });
  } catch (error) {
    console.error('Claim Verify API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
