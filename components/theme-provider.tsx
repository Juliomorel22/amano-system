"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false)

  // Standard pattern for next-themes + React 19 to avoid 
  // script injection during hydration.
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return children without the provider to match SSR
    return <>{children}</>
  }

  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}
