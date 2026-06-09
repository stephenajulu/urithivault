import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Find all beneficiary profiles matching the current logged-in user's email
    const beneficiaryProfiles = await db.beneficiary.findMany({
      where: { email: session.email.toLowerCase() },
      select: {
        id: true,
        ownerId: true,
        owner: {
          select: {
            email: true,
          },
        },
      },
    });

    if (beneficiaryProfiles.length === 0) {
      return NextResponse.json({ assets: [] });
    }

    const ownerIds = beneficiaryProfiles.map((b) => b.ownerId);

    // 2. Fetch claims for these owners
    const claims = await db.vaultClaim.findMany({
      where: {
        userId: { in: ownerIds },
        status: { in: ['pending', 'approved'] },
      },
    });

    const approvedOwnerIds = new Set<string>();

    const now = new Date();

    // Check if cooldown has expired for pending claims. If so, update to approved on-the-fly.
    for (const claim of claims) {
      if (claim.status === 'approved') {
        approvedOwnerIds.add(claim.userId);
      } else if (claim.status === 'pending' && claim.cooldownEnds <= now) {
        // Automatically approve claims that reached their cooldown target
        await db.vaultClaim.update({
          where: { id: claim.id },
          data: { status: 'approved' },
        });
        
        await db.auditLog.create({
          data: {
            userId: claim.userId,
            action: 'claim_approved',
            details: `Claim by ${claim.claimantId} automatically approved as the 14-day cooldown period expired.`,
          },
        });

        approvedOwnerIds.add(claim.userId);
      }
    }

    if (approvedOwnerIds.size === 0) {
      return NextResponse.json({
        message: 'No claims have been approved yet. Assets remain locked.',
        assets: [],
      });
    }

    // 3. Get all AssetAccess records for the approved owners and matching beneficiary profile IDs
    const beneficiaryIds = beneficiaryProfiles
      .filter((bp) => approvedOwnerIds.has(bp.ownerId))
      .map((bp) => bp.id);

    const assetAccesses = await db.assetAccess.findMany({
      where: {
        beneficiaryId: { in: beneficiaryIds },
      },
      include: {
        asset: {
          select: {
            id: true,
            category: true,
            metadataTags: true,
            encryptedPayload: true,
            createdAt: true,
            owner: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    // Format the response
    const results = assetAccesses.map((access) => ({
      assetId: access.assetId,
      category: access.asset.category,
      metadataTags: access.asset.metadataTags,
      encryptedPayload: access.asset.encryptedPayload,
      encryptedShareKey: access.encryptedShareKey,
      ownerEmail: access.asset.owner.email,
      createdAt: access.asset.createdAt,
    }));

    return NextResponse.json({ assets: results });
  } catch (error) {
    console.error('Claim Assets API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
