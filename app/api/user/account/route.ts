import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent demo users from deleting account
    const { demoGuard } = await import('@/lib/demo-guard')
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    // Delete all user data (cascading deletes will handle related records)
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
