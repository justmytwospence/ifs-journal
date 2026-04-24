import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { auth } from '@/lib/auth'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'IFS Journal - Discover Your Internal Parts',
  description: 'A therapeutic journaling app based on Internal Family Systems (IFS) therapy principles',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="antialiased">
        <QueryProvider>
          <SessionProvider session={session}>
            {children}
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
