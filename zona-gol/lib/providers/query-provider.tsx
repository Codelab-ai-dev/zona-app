"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, type ReactNode } from "react"

interface QueryProviderProps {
  children: ReactNode
}

// Helper para detectar errores de red que no deberían reintentarse agresivamente
function isNetworkError(error: unknown): boolean {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('fetch failed') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('ConnectTimeoutError')
  )
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
            // Retry inteligente: no reintentar en errores de red (evita ciclos)
            retry: (failureCount, error) => {
              // No reintentar errores de red - el servidor está caído
              if (isNetworkError(error)) {
                return false
              }
              // Para otros errores, máximo 1 reintento
              return failureCount < 1
            },
            // Delay más largo para evitar bombardear el servidor
            retryDelay: () => 5000, // 5 segundos fijo
          },
          mutations: {
            // No reintentar mutaciones en errores de red
            retry: (failureCount, error) => {
              if (isNetworkError(error)) return false
              return failureCount < 1
            },
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
