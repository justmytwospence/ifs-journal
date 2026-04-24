'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* Delay here applies to every Tooltip in the tree; 300ms matches the
          base-ui default but makes it explicit and adjustable in one place. */}
      <TooltipProvider delay={300}>{children}</TooltipProvider>
    </NextThemesProvider>
  )
}
