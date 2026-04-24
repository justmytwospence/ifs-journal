import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    const entryCount = await prisma.journalEntry.count()
    const partCount = await prisma.part.count()

    return NextResponse.json({
      success: true,
      data: {
        users: userCount,
        journalEntries: entryCount,
        parts: partCount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    )
  }
}
