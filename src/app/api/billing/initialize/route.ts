import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json(); // plan: 'premium' | 'enterprise'

    if (!plan || !['premium', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Valid plan (premium/enterprise) is required' },
        { status: 400 }
      );
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const origin = req.nextUrl.origin;

    // Standard Plan Pricing in KES (multiplied by 100 for cents/kobo)
    const amount = plan === 'premium' ? 1000 * 100 : 5000 * 100;

    if (!paystackSecret) {
      // Sandboxed Sandbox / Mock flow: auto-upgrade for demo if no key is set
      console.log('PAYSTACK_SECRET_KEY is not defined. Simulating checkout for plan:', plan);
      
      // Update user directly for sandboxed convenience
      await db.user.update({
        where: { id: session.userId },
        data: {
          subscriptionTier: plan,
          subscriptionStatus: 'active',
        },
      });

      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'subscription_success',
          details: `User simulated subscription to ${plan} tier (Mock Paystack Checkout).`,
        },
      });

      return NextResponse.json({
        mock: true,
        authorization_url: `${origin}/dashboard?payment_success=true&plan=${plan}`,
      });
    }

    // Real Paystack Checkout Integration
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.email,
        amount,
        currency: 'KES',
        callback_url: `${origin}/dashboard`,
        metadata: {
          userId: session.userId,
          plan,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack initialization error:', paystackData);
      throw new Error(paystackData.message || 'Paystack initialization failed');
    }

    return NextResponse.json({
      mock: false,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (error: any) {
    console.error('Billing Initialize API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
