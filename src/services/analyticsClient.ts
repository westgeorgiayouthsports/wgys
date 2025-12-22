export type WebsiteViewsResponse = { views: number };

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
