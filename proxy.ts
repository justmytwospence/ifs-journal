import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.isAdmin === true
  const path = req.nextUrl.pathname
  const isAuthPage =
    path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/reset-password')
  const isPublicPage = path === '/' || path === '/demo' || path === '/verify-email'
  const isAdminPath = path.startsWith('/admin')

  // /admin/* is dev-only. Return a 404 for anyone else — same response shape
  // as a non-existent route so we don't leak the existence of the surface.
  if (isAdminPath && !isAdmin) {
    return NextResponse.rewrite(new URL('/404', req.url))
  }

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
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
