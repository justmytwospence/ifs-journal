import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function checkDemoUser() {
  const session = await auth()
  return session?.user?.isDemo === true
}

export async function demoGuard() {
  const isDemo = await checkDemoUser()
  if (isDemo) {
    return NextResponse.json(
      { error: 'Demo users cannot make changes. Please create an account to save your own data.' },
      { status: 403 }
    )
  }
  return null
}
