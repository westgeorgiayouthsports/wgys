import type { ViewsSource } from '../types';
import { getEnv } from '../utils/env';

export type WebsiteViewsResponse = {
  views: number;
  realtimeViews?: number;
  source?: ViewsSource;
  timeseries?: Array<{ date: string; views: number; source?: ViewsSource }>;
};

const DEFAULT_METRICS_URL = '/api/metrics/views';
const METRICS_URL = getEnv('VITE_METRICS_URL') || DEFAULT_METRICS_URL;

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

export async function fetchWebsiteTrends(days = 7): Promise<{
  timeseries: NonNullable<WebsiteViewsResponse['timeseries']>;
  source?: ViewsSource;
  healthy: boolean;
  views?: number;
  realtimeViews?: number;
}> {
  // When requesting a 1-day range ask the backend for hourly granularity
  // if it's supported. We send `granularity=hour` which the Cloud Run
  // metrics service will treat as a hint to return YYYYMMDDHH keys.
  const granularityParam = days === 1 ? '&granularity=hour' : '';
  const urlsToTry = METRICS_URL === DEFAULT_METRICS_URL
    ? [`${DEFAULT_METRICS_URL}?timeseries=true&days=${days}${granularityParam}`]
    : [`${METRICS_URL}?timeseries=true&days=${days}${granularityParam}`, `${DEFAULT_METRICS_URL}?timeseries=true&days=${days}${granularityParam}`];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Failed to fetch trends: ${res.status}`);
      const data = (await res.json()) as Partial<WebsiteViewsResponse>;
      const timeseries = data.timeseries || [];
      const views = typeof data.views === 'number' ? data.views : undefined;
      const realtimeViews = typeof data.realtimeViews === 'number' ? data.realtimeViews : undefined;
      if (timeseries.length) {
        return { timeseries, source: data.source, healthy: true, views, realtimeViews };
      }
      // If no timeseries but we have top-level views, return that too
      if (typeof views === 'number' || typeof realtimeViews === 'number') {
        return { timeseries: [], source: data.source, healthy: true, views, realtimeViews };
      }
    } catch (error) {
      console.error('fetchWebsiteTrends error', url, error);
    }
  }

  return { timeseries: [], source: undefined, healthy: false };
}
