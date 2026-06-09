import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ownerEmail, proofDocumentUrl } = await req.json();

    if (!ownerEmail) {
      return NextResponse.json(
        { error: 'Owner email is required' },
        { status: 400 }
      );
    }

    // 1. Find the owner user
    const owner = await db.user.findUnique({
      where: { email: ownerEmail.toLowerCase() },
    });

    if (!owner) {
      return NextResponse.json(
        { error: 'Owner vault not found' },
        { status: 404 }
      );
    }

    // 2. Enforce check: Claimant must be listed as a beneficiary, a trustee, or be an admin
    let isEligible = false;
    let relationship = '';

    if (session.role === 'admin') {
      isEligible = true;
      relationship = 'Administrator';
    } else {
      // Check Beneficiaries
      const beneficiaryRecord = await db.beneficiary.findFirst({
        where: {
          ownerId: owner.id,
          email: session.email.toLowerCase(),
        },
      });

      if (beneficiaryRecord) {
        isEligible = true;
        relationship = beneficiaryRecord.relationship || 'Beneficiary';
      } else {
        // Check Trustees
        const trusteeRecord = await db.trustee.findFirst({
          where: {
            ownerId: owner.id,
            email: session.email.toLowerCase(),
          },
        });

        if (trusteeRecord) {
          isEligible = true;
          relationship = trusteeRecord.role || 'Trustee';
        }
      }
    }

    if (!isEligible) {
      return NextResponse.json(
        { error: 'You are not designated as a beneficiary or trustee of this vault.' },
        { status: 403 }
      );
    }

    // 3. Check if there is already a pending claim
    const existingClaim = await db.vaultClaim.findFirst({
      where: {
        userId: owner.id,
        claimantId: session.userId,
        status: 'pending',
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: 'A pending claim already exists for this vault.' },
        { status: 400 }
      );
    }

    // 4. Create the claim record with 14-day escrow cooldown
    const cooldownDays = 14;
    const cooldownStarts = new Date();
    const cooldownEnds = new Date(cooldownStarts.getTime() + cooldownDays * 24 * 60 * 60 * 1000);

    const claim = await db.vaultClaim.create({
      data: {
        userId: owner.id,
        claimantId: session.userId,
        proofDocumentUrl: proofDocumentUrl || null,
        cooldownStarts,
        cooldownEnds,
        status: 'pending',
      },
    });

    // 5. Log audit trail for owner and claimant
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || null;
    await db.auditLog.create({
      data: {
        userId: owner.id,
        action: 'claim_initiated',
        details: `Claim initiated by ${session.email} (${relationship}). Cooldown period ends at ${cooldownEnds.toLocaleString()}.`,
        ipAddress: ip,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'claim_initiated',
        details: `Initiated claim against vault owner: ${owner.email}. Proof document: ${proofDocumentUrl || 'None'}`,
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      message: 'Claim filed successfully. Cooldown escrow period started.',
      claim,
    }, { status: 201 });
  } catch (error) {
    console.error('Claim Create API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
