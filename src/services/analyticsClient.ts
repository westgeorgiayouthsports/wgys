export type WebsiteViewsResponse = { views: number; realtimeViews?: number; source?: 'standard' | 'eventCount' | 'realtime' };

const DEFAULT_METRICS_URL = '/api/metrics/views';
const METRICS_URL = import.meta.env.VITE_METRICS_URL || DEFAULT_METRICS_URL;

export async function fetchWebsiteViews(): Promise<number> {
  const urlsToTry = METRICS_URL === DEFAULT_METRICS_URL
    ? [DEFAULT_METRICS_URL]
    : [METRICS_URL, DEFAULT_METRICS_URL];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Failed to fetch views: ${res.status}`);
      const data = (await res.json()) as Partial<WebsiteViewsResponse>;
      if (typeof data.views === 'number') {
        return data.views;
      }
    } catch (error) {
      console.error('fetchWebsiteViews error', url, error);
    }
  }

  return 0;
}

// Health-aware fetch that distinguishes between a successful call (even when views=0)
// and a failure to reach any metrics endpoint.
export async function fetchWebsiteMetrics(): Promise<{ views: number; healthy: boolean; realtimeViews?: number; source?: WebsiteViewsResponse['source'] }> {
  const urlsToTry = METRICS_URL === DEFAULT_METRICS_URL
    ? [DEFAULT_METRICS_URL]
    : [METRICS_URL, DEFAULT_METRICS_URL];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Failed to fetch views: ${res.status}`);
      const data = (await res.json()) as Partial<WebsiteViewsResponse>;
      const views = typeof data.views === 'number' ? data.views : 0;
      const realtimeViews = typeof data.realtimeViews === 'number' ? data.realtimeViews : undefined;
      return { views, healthy: true, realtimeViews, source: data.source };
    } catch (error) {
      console.error('fetchWebsiteMetrics error', url, error);
      // try next URL
    }
  }

  return { views: 0, healthy: false };
}
