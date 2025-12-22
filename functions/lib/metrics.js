import { onRequest } from 'firebase-functions/v2/https';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
/**
 * Fetch website views from GA4 for the last 7 days.
 * Requires GA4_KEY (service account JSON) and GA4_PROPERTY_ID in environment.
 */
export const metricsViews = onRequest({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true, // Enable CORS for all origins
    secrets: ['GA4_KEY', 'GA4_PROPERTY_ID', 'ALLOWED_ORIGIN'] // Load Firebase secrets
}, async (req, res) => {
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
    }
    else if (reqOrigin && allowedList.includes(reqOrigin)) {
        res.set('Access-Control-Allow-Origin', reqOrigin);
    }
    else if (req.method === 'OPTIONS') {
        // For preflight, respond without revealing details if origin not allowed
        res.status(204).send('');
        return;
    }
    else {
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
        let creds;
        try {
            creds = JSON.parse(raw);
        }
        catch {
            throw new Error('Invalid GA4_KEY format (must be valid JSON)');
        }
        // Initialize GA4 Data API client
        const client = new BetaAnalyticsDataClient({
            credentials: {
                client_email: creds.client_email,
                private_key: creds.private_key,
            },
        });
        // Query GA4 for page views from last 7 days
        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: '7daysAgo',
                    endDate: 'today',
                },
            ],
            metrics: [
                {
                    name: 'screenPageViews',
                },
            ],
        });
        // Extract view count from response
        const views = response.rows?.[0]?.metricValues?.[0]?.value
            ? Number(response.rows[0].metricValues[0].value)
            : 0;
        const metricsResponse = { views };
        res.json(metricsResponse);
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('metricsViews error:', errorMsg);
        const metricsResponse = {
            views: 0,
            error: 'metrics_failed',
        };
        res.status(500).json(metricsResponse);
    }
});
