import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { ThemeProvider } from '@/lib/theme'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000, refetchOnWindowFocus: false,
        // Pas de nouvelle tentative sur les refus d'accès / validation : seulement sur pannes réseau ou serveur.
        retry: (count, error) => (error instanceof ApiError && error.status >= 400 && error.status < 500 ? false : count < 1),
      },
    },
  })
}

export function Providers({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [qc] = useState(() => client ?? makeQueryClient())
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <ToastProvider><AuthProvider>{children}</AuthProvider></ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
