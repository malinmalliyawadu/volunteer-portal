import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getEmailService } from '@/lib/email-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, firstName } = body;

    if (!email || !firstName) {
      return NextResponse.json(
        { error: 'Missing required fields: email and firstName' },
        { status: 400 }
      );
    }

    // Generate test migration link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const testToken = 'test-token-' + Date.now();
    const migrationLink = `${baseUrl}/migrate?token=${testToken}`;

    // Send test email
    const emailService = getEmailService();
    await emailService.sendMigrationInvite({
      to: email,
      firstName,
      migrationLink
    });

    return NextResponse.json({
      success: true,
      message: 'Test migration invite sent successfully',
      data: {
        email,
        migrationLink
      }
    });

  } catch (error) {
    console.error('Error sending test migration invite:', error);
    return NextResponse.json(
      { error: 'Failed to send test migration invite', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}