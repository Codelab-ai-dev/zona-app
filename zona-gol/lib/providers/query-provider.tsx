"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, type ReactNode } from "react"

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Datos considerados frescos por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Mantener en caché por 30 minutos
            gcTime: 30 * 60 * 1000,
            // No recargar al enfocar la ventana (reduce requests)
            refetchOnWindowFocus: false,
            // No recargar al reconectar
            refetchOnReconnect: false,
            // Reintentar 2 veces en caso de error
            retry: 2,
            // Delay exponencial entre reintentos
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Reintentar mutaciones 1 vez
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  )
}
