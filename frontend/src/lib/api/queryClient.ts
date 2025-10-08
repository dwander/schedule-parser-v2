import { QueryClient } from '@tanstack/react-query'
import { QUERY_CONFIG } from '@/lib/constants/query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.STALE_TIME_MS,
      gcTime: QUERY_CONFIG.GC_TIME_MS,
      retry: QUERY_CONFIG.QUERY_RETRY_COUNT,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: QUERY_CONFIG.MUTATION_RETRY_COUNT,
    },
  },
})
