import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('Authorization');

    // Secure the cron endpoint in production using Vercel authorization secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // 1. Fetch all pending claims
    const pendingClaims = await db.vaultClaim.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, email: true } },
        claimant: { select: { id: true, email: true } },
      },
    });

    const approvedCount = 0;
    const alertCount = 0;

    const results = [];

    for (const claim of pendingClaims) {
      if (claim.cooldownEnds <= now) {
        // Cooldown period has expired without response: auto-approve
        await db.vaultClaim.update({
          where: { id: claim.id },
          data: { status: 'approved' },
        });

        await db.auditLog.create({
          data: {
            userId: claim.userId,
            action: 'claim_approved',
            details: `Claim filed by ${claim.claimant?.email} automatically approved. Cooldown timer completed.`,
          },
        });

        results.push({
          claimId: claim.id,
          owner: claim.user?.email,
          action: 'auto_approved',
        });
      } else {
        // Cooldown is still active: send daily Proof of Life notifications
        // Integration point for Africa's Talking SMS & Resend transactional emails
        console.log(`[Alert Dispatcher] Dispatched warning to owner: ${claim.user?.email} for claim filed by ${claim.claimant?.email}`);

        // Write to audit trail
        await db.auditLog.create({
          data: {
            userId: claim.userId,
            action: 'escrow_alert_sent',
            details: `Daily warnings sent: SMS (Africa's Talking mock) and Email (Resend mock) dispatched.`,
          },
        });

        results.push({
          claimId: claim.id,
          owner: claim.user?.email,
          action: 'warning_dispatched',
        });
      }
    }

    return NextResponse.json({
      message: 'Cron execution completed successfully.',
      processed: results.length,
      details: results,
    });
  } catch (error) {
    console.error('Escrow Cron API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
