import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (secret && signature) {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(rawBody)
        .digest('hex');

      if (hash !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === 'charge.success') {
      const data = payload.data;
      const metadata = data.metadata;
      const userId = metadata?.userId;
      const plan = metadata?.plan;

      if (userId && plan) {
        await db.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: plan,
            subscriptionStatus: 'active',
          },
        });

        await db.auditLog.create({
          data: {
            userId,
            action: 'subscription_success',
            details: `User upgraded to ${plan} tier via Paystack. Reference: ${data.reference}`,
          },
        });

        console.log(`Successfully processed Paystack webhook upgrade for userId: ${userId} to ${plan}`);
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Paystack Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
