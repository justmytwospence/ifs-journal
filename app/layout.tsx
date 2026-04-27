import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import { QueryCacheAuthSync } from '@/components/auth/QueryCacheAuthSync'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { DemoBanner } from '@/components/DemoBanner'
import { Footer } from '@/components/Footer'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { auth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import './globals.css'

// Inter provides both `--font-inter` (legacy reference) and `--font-sans`
// (what shadcn's @theme block looks up via `font-sans`). Mapping to the
// same typeface keeps the UI visually coherent while shadcn components
// render correctly.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ifsjournal.me'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'IFS Journal — Discover Your Internal Parts',
    template: '%s · IFS Journal',
  },
  description:
    'A therapeutic journaling app based on Internal Family Systems (IFS) therapy principles. Write entries; Claude identifies the parts speaking through your writing and grounds them in cited passages.',
  applicationName: 'IFS Journal',
  openGraph: {
    type: 'website',
    siteName: 'IFS Journal',
    title: 'IFS Journal — Discover Your Internal Parts',
    description:
      'Citation-grounded IFS journaling. Write entries; Claude identifies the parts speaking through your writing.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IFS Journal — Discover Your Internal Parts',
    description:
      'Citation-grounded IFS journaling. Write entries; Claude identifies the parts speaking through your writing.',
  },
  robots: { index: true, follow: true },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html
      lang="en"
      className={cn(inter.variable, lora.variable, 'font-sans')}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider>
          <QueryProvider>
            <SessionProvider session={session}>
              <QueryCacheAuthSync />
              <div className="min-h-screen flex flex-col">
                <DemoBanner />
                <div className="flex-1">{children}</div>
                <Footer />
              </div>
            </SessionProvider>
          </QueryProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
