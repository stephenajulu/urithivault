import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let claims: any[] = [];

    if (session.role === 'admin') {
      // Admins see everything
      claims = await db.vaultClaim.findMany({
        include: {
          user: { select: { email: true, id: true } },
          claimant: { select: { email: true, id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (session.role === 'owner') {
      // Owners see claims against their own vault
      claims = await db.vaultClaim.findMany({
        where: { userId: session.userId },
        include: {
          claimant: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (session.role === 'beneficiary') {
      // Beneficiaries see claims they created
      claims = await db.vaultClaim.findMany({
        where: { claimantId: session.userId },
        include: {
          user: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (session.role === 'trustee') {
      // Trustees see claims against vaults where they are designated as a trustee
      const trusteeRelations = await db.trustee.findMany({
        where: { email: session.email.toLowerCase() },
        select: { ownerId: true },
      });
      const ownerIds = trusteeRelations.map((t) => t.ownerId);

      claims = await db.vaultClaim.findMany({
        where: { userId: { in: ownerIds } },
        include: {
          user: { select: { email: true } },
          claimant: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Claim List API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
