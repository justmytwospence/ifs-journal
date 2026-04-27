import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'

// Belt-and-suspenders admin gate. proxy.ts already 404s non-admins on any
// /admin/* path, but a server-side check here ensures the page never even
// renders if someone bypasses the middleware (e.g. via a route handler that
// imports a page component, or a middleware misconfiguration).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/evals" className="font-heading text-base tracking-tight">
              admin
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/admin/evals" className="hover:text-foreground">
                evals
              </Link>
            </nav>
          </div>
          <div className="text-xs text-muted-foreground">{session.user.email}</div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
