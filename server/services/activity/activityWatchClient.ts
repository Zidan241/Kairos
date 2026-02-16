/**
 * ActivityWatch REST API Client
 * Replaces the Python aw-client library with native HTTP calls to localhost:5600.
 */

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

export interface AWEvent {
  id?: number;
  timestamp: string;
  duration: number;
  data: {
    app?: string;
    title?: string;
    status?: string;
    [key: string]: unknown;
  };
}
export class ActivityWatchClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a fetch request with timeout and retry
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = MAX_RETRIES
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if ActivityWatch server is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/api/0/info`, {
        signal: AbortSignal.timeout(2000),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute an AW query (same as Python aw-client's query())
   */
  private async query(
    queryCode: string,
    timeperiods: Array<[Date, Date]>
  ): Promise<unknown[]> {
    const body = {
      query: queryCode.split('\n'),
      timeperiods: timeperiods.map(
        ([s, e]) => `${s.toISOString()}/${e.toISOString()}`
      ),
    };

    const res = await this.fetchWithRetry(`${this.baseUrl}/api/0/query/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return res.json();
  }

  /**
   * Get canonical events — window events filtered by non-AFK time, merged by app.
   */
  async getCanonicalEvents(start: Date, end: Date): Promise<AWEvent[]> {
    // Single query using find_bucket() — matches Python client's approach
    // Note: AW bucket names use underscore separator (e.g. aw-watcher-window_hostname)
    const query = `
      events = flood(query_bucket(find_bucket("aw-watcher-window_")));
      not_afk = flood(query_bucket(find_bucket("aw-watcher-afk_")));
      not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);
      events = filter_period_intersect(events, not_afk);
      events = merge_events_by_keys(events, ["app"]);
      RETURN = {"events": events};
    `;

    const result = await this.query(query, [[start, end]]);

    if (
      !result ||
      !Array.isArray(result) ||
      result.length === 0 ||
      !result[0]
    ) {
      return [];
    }

    const firstResult = result[0] as Record<string, unknown>;
    const events = firstResult.events;
    if (!Array.isArray(events)) return [];

    return events as AWEvent[];
  }
}
