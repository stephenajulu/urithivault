import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, metadataTags, encryptedPayload } = await req.json();

    if (!category || !encryptedPayload) {
      return NextResponse.json(
        { error: 'Category and encrypted payload are required' },
        { status: 400 }
      );
    }

    // Get owner subscription details
    const owner = await db.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });

    if (!owner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check existing assets count
    const assetCount = await db.asset.count({
      where: { ownerId: session.userId },
    });

    // Check existing video message count if adding video
    const videoCount = await db.asset.count({
      where: { ownerId: session.userId, category: 'video' },
    });

    const tier = owner.subscriptionTier.toLowerCase();

    // 1. Basic Tier Limits
    if (tier === 'basic') {
      if (assetCount >= 3) {
        return NextResponse.json(
          { error: 'Subscription Limit Reached: Basic tier allows a maximum of 3 assets. Please upgrade to Premium or Enterprise for unlimited assets.' },
          { status: 403 }
        );
      }
      if (category === 'video') {
        return NextResponse.json(
          { error: 'Subscription Limit Reached: Video messages are not available on the Basic tier. Please upgrade to Premium or Enterprise.' },
          { status: 403 }
        );
      }
    }

    // 2. Premium Tier Limits
    if (tier === 'premium') {
      if (category === 'video' && videoCount >= 1) {
        return NextResponse.json(
          { error: 'Subscription Limit Reached: Premium tier allows a maximum of 1 legacy video message. Please upgrade to Enterprise for up to 5 video messages.' },
          { status: 403 }
        );
      }
    }

    // 3. Enterprise Tier Limits
    if (tier === 'enterprise') {
      if (category === 'video' && videoCount >= 5) {
        return NextResponse.json(
          { error: 'Subscription Limit Reached: Enterprise tier allows a maximum of 5 legacy video messages.' },
          { status: 403 }
        );
      }
    }

    // Create the asset linked to the logged-in user
    const asset = await db.asset.create({
      data: {
        ownerId: session.userId,
        category,
        metadataTags: metadataTags || '',
        encryptedPayload,
      },
    });

    // Log the audit action
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'vault_edit',
        details: `Logged new asset in category: ${category}`,
        ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
      },
    });

    return NextResponse.json({
      message: 'Asset logged and encrypted successfully',
      assetId: asset.id,
    }, { status: 201 });
  } catch (error) {
    console.error('Asset Create API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
