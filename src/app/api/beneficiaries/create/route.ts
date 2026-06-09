import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, phone, relationship, assetIds, encryptedShareKey } = await req.json();

    if (!email || !encryptedShareKey) {
      return NextResponse.json(
        { error: 'Email and encrypted share key are required' },
        { status: 400 }
      );
    }

    // Get owner subscription details
    const owner = await db.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionTier: true },
    });

    if (!owner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count existing beneficiaries
    const beneficiaryCount = await db.beneficiary.count({
      where: { ownerId: session.userId },
    });

    const tier = owner.subscriptionTier.toLowerCase();

    // 1. Basic Tier: Max 1 beneficiary
    if (tier === 'basic' && beneficiaryCount >= 1) {
      return NextResponse.json(
        { error: 'Subscription Limit Reached: Basic tier allows a maximum of 1 designated beneficiary. Please upgrade to Premium or Enterprise.' },
        { status: 403 }
      );
    }

    // 2. Premium Tier: Max 5 beneficiaries
    if (tier === 'premium' && beneficiaryCount >= 5) {
      return NextResponse.json(
        { error: 'Subscription Limit Reached: Premium tier allows a maximum of 5 designated beneficiaries. Please upgrade to Enterprise for unlimited beneficiaries.' },
        { status: 403 }
      );
    }

    // Create the beneficiary
    const beneficiary = await db.beneficiary.create({
      data: {
        ownerId: session.userId,
        email: email.toLowerCase(),
        phone: phone || '',
        relationship: relationship || '',
      },
    });

    // Map the beneficiary to the selected assets
    if (assetIds && Array.isArray(assetIds) && assetIds.length > 0) {
      const accessData = assetIds.map((assetId: string) => ({
        assetId,
        beneficiaryId: beneficiary.id,
        encryptedShareKey, // VDK encrypted with the beneficiary's passcode
      }));

      await db.assetAccess.createMany({
        data: accessData,
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'vault_edit',
        details: `Created beneficiary: ${email} and mapped to ${assetIds?.length || 0} assets`,
        ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
      },
    });

    return NextResponse.json({
      message: 'Beneficiary registered and asset access mapped successfully',
      beneficiaryId: beneficiary.id,
    }, { status: 201 });
  } catch (error) {
    console.error('Beneficiary Create API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
