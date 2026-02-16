import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isElectron } from "@/hooks/useElectron";

// Cache the resolved base URL so we only fetch the port once
let _baseUrl: string = '';
let _baseUrlPromise: Promise<string> | null = null;

/**
 * In Electron, API calls must target the actual server port (which may differ
 * from DEFAULT_SERVER_PORT if that port was busy). In the browser/Vite dev,
 * relative URLs are fine because Vite proxies /api to the server.
 */
async function getBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl;
  if (_baseUrlPromise) return _baseUrlPromise;

  _baseUrlPromise = (async () => {
    if (isElectron() && window.electronAPI) {
      try {
        const port = await window.electronAPI.getServerPort();
        _baseUrl = `http://localhost:${port}`;
      } catch {
        _baseUrl = '';
      }
    } else {
      _baseUrl = '';
    }
    return _baseUrl;
  })();

  return _baseUrlPromise;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

export const getQueryFn: <T>() => QueryFunction<T> =
  () =>
  async ({ queryKey }) => {
    const base = await getBaseUrl();
    const res = await fetch(`${base}${queryKey.join("/")}`);

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
