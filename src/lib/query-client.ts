import { QueryClient } from '@tanstack/react-query';

// A module-level singleton (rather than one scoped to the Providers component) so
// non-React code — the Axios 401 interceptor in api-client.ts — can also clear it.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});
