import { onRequest } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

interface GaCreds {
  client_email: string;
  private_key: string;
}

interface MetricsResponse {
  views: number;
  realtimeViews?: number;
  source?: 'standard' | 'eventCount' | 'realtime';
  timeseries?: Array<{ date: string; views: number; source?: MetricsResponse['source'] }>;
  error?: string;
}

/**
 * Fetch website views from GA4 for the last 7 days.
 * Requires GA4_KEY (service account JSON) and GA4_PROPERTY_ID in environment.
 */
export const metricsViews = onRequest(
  { 
    region: 'us-central1', 
    memory: '256MiB', 
    timeoutSeconds: 60,
    cors: true, // Enable CORS for all origins
    secrets: ['GA4_KEY', 'GA4_PROPERTY_ID', 'ALLOWED_ORIGIN'] // Load Firebase secrets
  },
  async (req: Request, res: Response) => {
    // Additional CORS headers for explicit control (supports multiple origins)
    const allowedEnv = process.env.ALLOWED_ORIGIN || '*';
    const allowedList = allowedEnv.split(',').map((s) => s.trim().toLowerCase());
    const reqOrigin = (req.headers.origin || '').toLowerCase();

    // Vary on Origin for correct caching behavior
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    const allowAll = allowedList.includes('*');
    if (allowAll) {
      res.set('Access-Control-Allow-Origin', '*');
    } else if (reqOrigin && allowedList.includes(reqOrigin)) {
      res.set('Access-Control-Allow-Origin', reqOrigin);
    } else if (req.method === 'OPTIONS') {
      // For preflight, respond without revealing details if origin not allowed
      res.status(204).send('');
      return;
    } else {
      res.status(403).json({ views: 0, error: 'origin_not_allowed' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ views: 0, error: 'method_not_allowed' });
      return;
    }

    try {
      const raw = process.env.GA4_KEY;
      const propertyId = process.env.GA4_PROPERTY_ID;

      if (!raw) {
        throw new Error('Missing GA4_KEY environment variable');
      }
      if (!propertyId) {
        throw new Error('Missing GA4_PROPERTY_ID environment variable');
      }

      // Parse service account credentials
      let creds: GaCreds;
      try {
        creds = JSON.parse(raw);
      } catch {
        throw new Error('Invalid GA4_KEY format (must be valid JSON)');
      }

      // Initialize GA4 Data API client
      const client = new BetaAnalyticsDataClient({
        credentials: {
          client_email: creds.client_email,
          private_key: creds.private_key,
        },
      });

      const daysParam = Number(req.query.days) || 30;
      const days = Math.min(Math.max(1, daysParam), 365);
      const wantTimeseries = req.query.timeseries === 'true' || req.query.timeseries === '1';

      // Query GA4 for page views from last N days (standard report - may have latency)
      let source: MetricsResponse['source'] = 'standard';
      let realtimeViews = 0;
      let timeseries: MetricsResponse['timeseries'] = undefined;

      const baseDateRange = [{ startDate: `${Math.max(0, days - 1)}daysAgo`, endDate: 'today' }];

      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: baseDateRange,
        metrics: [ { name: 'screenPageViews' } ],
        dimensions: wantTimeseries ? [ { name: 'date' } ] : undefined,
      });

      // Extract view count from response
      let views = 0;
      if (wantTimeseries && response.rows?.length) {
        timeseries = response.rows.map((row) => {
          const date = row.dimensionValues?.[0]?.value ?? '';
          const v = Number(row.metricValues?.[0]?.value ?? '0');
          views += Number.isNaN(v) ? 0 : v;
          return { date, views: Number.isNaN(v) ? 0 : v, source };
        });
      } else {
        views = response.rows?.[0]?.metricValues?.[0]?.value
          ? Number(response.rows[0].metricValues[0].value)
          : 0;
      }

      // Fallback #1: some properties report views primarily via eventCount 'page_view'
      if (!views) {
        const [fallback] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: baseDateRange,
          dimensions: wantTimeseries ? [ { name: 'date' } ] : [ { name: 'eventName' } ],
          metrics: [ { name: 'eventCount' } ],
          dimensionFilter: wantTimeseries
            ? { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } }
            : { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } }
        });

        if (wantTimeseries && fallback.rows?.length) {
          timeseries = fallback.rows.map((row) => {
            const dim0 = row.dimensionValues?.[0]?.value ?? '';
            // When timeseries, dim0 is date; when aggregate, dim0 might be eventName
            const date = dim0.length === 8 ? dim0 : '';
            const v = Number(row.metricValues?.[0]?.value ?? '0');
            return { date, views: Number.isNaN(v) ? 0 : v, source: 'eventCount' };
          });
          views = timeseries.reduce((sum, r) => sum + (r.views || 0), 0);
          source = 'eventCount';
        } else {
          const fallbackVal = fallback.rows?.[0]?.metricValues?.[0]?.value;
          if (fallbackVal) {
            const n = Number(fallbackVal);
            if (!Number.isNaN(n)) {
              views = n;
              source = 'eventCount';
            }
          }
        }
      }

      // Fallback #2: new properties can take time to populate standard reports.
      // Use Realtime API (last 30 minutes) to return a non-zero indicator if activity exists.
      if (!views) {
        try {
          const [rt] = await client.runRealtimeReport({
            property: `properties/${propertyId}`,
            metrics: [ { name: 'eventCount' } ],
            dimensions: [ { name: 'eventName' } ],
            dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } },
          });
          const rtVal = rt.rows?.[0]?.metricValues?.[0]?.value;
          if (rtVal) {
            const n = Number(rtVal);
            if (!Number.isNaN(n) && n > 0) {
              views = n; // treat as near-real-time indicator
              realtimeViews = n;
              source = 'realtime';
            }
          }
        } catch (rtErr) {
          console.warn('Realtime fallback failed:', rtErr);
        }
      }

      // Sort timeseries chronologically if present
      if (timeseries?.length) {
        timeseries = timeseries
          .filter((r) => r.date)
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      const metricsResponse: MetricsResponse = { views, realtimeViews, source, timeseries };
      res.json(metricsResponse);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('metricsViews error:', errorMsg);
      const metricsResponse: MetricsResponse = {
        views: 0,
        error: 'metrics_failed',
      };
      res.status(500).json(metricsResponse);
    }
  });
