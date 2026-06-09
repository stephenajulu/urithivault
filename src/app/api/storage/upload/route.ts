import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get owner subscription details
    const owner = await db.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionTier: true },
    });

    if (!owner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tier = owner.subscriptionTier.toLowerCase();
    const fileSizeInMB = file.size / (1024 * 1024);

    let maxSingleFileSizeMB = 5; // Basic tier: 5MB max per file
    if (tier === 'premium') {
      maxSingleFileSizeMB = 50; // Premium tier: 50MB max per file
    } else if (tier === 'enterprise') {
      maxSingleFileSizeMB = 250; // Enterprise tier: 250MB max per file
    }

    if (fileSizeInMB > maxSingleFileSizeMB) {
      return NextResponse.json(
        { error: `File size exceeds limits. Your tier (${tier}) allows a maximum of ${maxSingleFileSizeMB}MB per file. Please upgrade to increase your limits.` },
        { status: 403 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${session.userId}-${Date.now()}.enc`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // Create the upload directory if it does not exist
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error('File Upload Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
