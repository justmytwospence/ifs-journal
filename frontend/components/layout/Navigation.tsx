'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
}

const navItems: NavItem[] = [
  { label: 'Journal', href: '/journal' },
  { label: 'Log', href: '/log' },
  { label: 'Parts', href: '/parts' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-sage-200 bg-white">
      <div className="container-width section-padding">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IFS</span>
            </div>
            <span className="text-xl font-semibold text-sage-900">Journal</span>
          </Link>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-sage-600 hover:bg-sage-100 hover:text-sage-900'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Link href="/profile" className="btn btn-ghost">
              Profile
            </Link>
            <button className="btn btn-ghost">Sign Out</button>
          </div>
        </div>
      </div>
    </nav>
  )
}
