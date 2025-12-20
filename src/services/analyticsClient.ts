export type WebsiteViewsResponse = { views: number };

// Placeholder client that can be wired to a backend or Google Analytics Data API proxy.
const METRICS_URL = import.meta.env.VITE_METRICS_URL || '/api/metrics/views';

export async function fetchWebsiteViews(): Promise<number> {
  try {
    const res = await fetch(METRICS_URL);
    if (!res.ok) throw new Error(`Failed to fetch views: ${res.status}`);
    const data = (await res.json()) as Partial<WebsiteViewsResponse>;
    return typeof data.views === 'number' ? data.views : 0;
  } catch (error) {
    console.error('fetchWebsiteViews error', error);
    return 0;
  }
}
