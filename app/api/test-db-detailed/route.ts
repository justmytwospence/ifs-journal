import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    })

    const entries = await prisma.journalEntry.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        prompt: true,
        wordCount: true,
        analysisStatus: true,
        createdAt: true,
      },
    })

    const parts = await prisma.part.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        color: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        users,
        recentEntries: entries,
        parts,
      },
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { success: false, error: 'Database query failed' },
      { status: 500 }
    )
  }
}
