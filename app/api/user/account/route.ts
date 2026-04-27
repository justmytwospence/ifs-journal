import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@/lib/logger'

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { demoGuard } = await import('@/lib/demo-guard')
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    // Require explicit confirmation in the body so a stray fetch can't wipe
    // an account. Client sends `{ confirm: "DELETE <email>" }`.
    let body: unknown = null
    try {
      body = await request.json()
    } catch {
      // Missing body — treated as missing confirmation below.
    }
    const confirm =
      body && typeof body === 'object' && 'confirm' in body
        ? (body as { confirm: unknown }).confirm
        : null
    const expected = `DELETE ${session.user.email}`
    if (typeof confirm !== 'string' || confirm !== expected) {
      return NextResponse.json(
        { error: `Confirmation required. Send { confirm: "${expected}" }.` },
        { status: 400 }
      )
    }

    // FK relations cascade from User; this single delete is sufficient.
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    captureException(error, { route: 'DELETE /api/user/account' })
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
