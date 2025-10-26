import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/register') ||
    req.nextUrl.pathname.startsWith('/reset-password')
  const isPublicPage = req.nextUrl.pathname === '/' ||
    req.nextUrl.pathname.startsWith('/api/auth')

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/journal', req.url))
  }

  // Redirect non-logged-in users to login (except public pages)
  if (!isLoggedIn && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/test|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
