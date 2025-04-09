import { QueryClient, QueryFunction } from "@tanstack/react-query";

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const error = new Error(`${res.status}: ${res.statusText}`) as ApiError;
    error.status = res.status;
    try {
      error.data = await res.json();
    } catch {
      error.data = await res.text();
    }
    throw error;
  }
}

export async function apiRequest<T>(
  method: string,
  url: string,
  data?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        const err = error as ApiError;
        if (err.status === 401 || err.status === 403) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
