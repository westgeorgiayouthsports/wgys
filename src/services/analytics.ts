type GtagEvent = {
  action: string;
  params?: Record<string, unknown>;
};

let analyticsInitialized = false;

function loadGtag(measurementId: string) {
  if (analyticsInitialized) return;
  if (!measurementId) return;

  // Initialize dataLayer FIRST
  window.dataLayer = window.dataLayer || [];
  
  // Define a gtag function that will queue events until the real gtag loads
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  }
  (window as any).gtag = gtag;

  // Queue the initial GA bootstrap event and config immediately
  // This matches Google's recommended snippet and ensures GA processes events
  // even if the library loads slightly later.
  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false,
    debug_mode: true,
    transport_type: 'beacon',
  });

  // NOW load the actual Google gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  
  script.onload = () => {
    console.log('[ga] gtag script loaded successfully');
    console.log('[ga] window.gtag is now:', typeof window.gtag);
    console.log('[ga] dataLayer after script load:', window.dataLayer);
  };
  
  script.onerror = (error) => {
    console.error('[ga] Failed to load gtag script - likely blocked by ad blocker or privacy settings', error);
  };
  
  document.head.appendChild(script);
  console.log('[ga] gtag script element created and appended');
  
  analyticsInitialized = true;
}

export function initAnalytics(measurementId: string | undefined) {
  console.log('[ga] measurementId', measurementId);
  if (!measurementId) return;
  loadGtag(measurementId);
  console.log('[ga] gtag initialization started');
  
  // Send a test event to verify GA is working
  setTimeout(() => {
    if (window.gtag) {
      window.gtag('event', 'app_initialized', { debug_mode: true });
      console.log('[ga] test event sent, dataLayer:', window.dataLayer);
    } else {
      console.warn('[ga] window.gtag not available after 1 second');
    }
  }, 1000);
}

export function trackPageView(page: { page_path: string; page_title?: string; page_location?: string }) {
  if (!window.gtag) return;
  console.log('[ga] trackPageView', page.page_path);
  window.gtag('event', 'page_view', page);
  // Measurement Protocol fallback - ensures GA receives events even when browser blocks gtag beacons
  // GA4 API secrets are safe for client-side use (unlike Stripe secret keys)
  if (import.meta && (import.meta as any).env?.VITE_GA4_API_SECRET) {
    trackPageViewMPFallback(page);
  }
}

// --- Measurement Protocol fallback (dev only) ---
function getClientIdFromCookie(): string | undefined {
  const m = document.cookie.match(/_ga=GA\d\.\d\.(\d+\.\d+)/);
  return m?.[1];
}

// --- Simple session management for GA4 MP so realtime 'Active users' appears ---
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const LS_SESSION_ID = 'ga_session_id';
const LS_SESSION_NUM = 'ga_session_number';
const LS_SESSION_START = 'ga_session_start';
const LS_LAST_EVENT_TS = 'ga_last_event_ts';

function nowMs() {
  return Date.now();
}

function getOrCreateSession() {
  const now = nowMs();
  const storedId = localStorage.getItem(LS_SESSION_ID);
  const storedStart = Number(localStorage.getItem(LS_SESSION_START) || '0');
  let sessionId = storedId ? Number(storedId) : 0;
  let sessionStart = storedStart;
  let sessionNumber = Number(localStorage.getItem(LS_SESSION_NUM) || '0');
  let isNew = false;

  if (!sessionId || !sessionStart || now - sessionStart > SESSION_TTL_MS) {
    // New session
    sessionId = Math.floor(now / 1000); // seconds
    sessionStart = now;
    sessionNumber = sessionNumber + 1 || 1;
    localStorage.setItem(LS_SESSION_ID, String(sessionId));
    localStorage.setItem(LS_SESSION_NUM, String(sessionNumber));
    localStorage.setItem(LS_SESSION_START, String(sessionStart));
    isNew = true;
  }

  return { sessionId, sessionNumber, sessionStart, isNew };
}

// Track engagement time between events and store last event timestamp.
function takeEngagementMs(): number {
  const now = nowMs();
  const last = Number(localStorage.getItem(LS_LAST_EVENT_TS) || '0');
  let delta = last ? now - last : 0;
  // GA recommends providing a small engagement time; clamp to sensible bounds
  if (!delta || delta < 100) delta = 100; // minimum 100ms
  if (delta > 60000) delta = 60000; // cap at 60s per event
  localStorage.setItem(LS_LAST_EVENT_TS, String(now));
  return delta;
}

async function sendMeasurementProtocolEvent(
  measurementId: string,
  apiSecret: string,
  name: string,
  params: Record<string, unknown>
) {
  const { sessionId, sessionNumber, isNew } = getOrCreateSession();
  const cid = getClientIdFromCookie() || `${Math.floor(Math.random() * 1e10)}.${Date.now()}`;
  const engagementMs = takeEngagementMs();
  const baseParams = {
    ...params,
    session_id: sessionId,
    session_number: sessionNumber,
    engagement_time_msec: engagementMs,
  } as Record<string, unknown>;

  const events: Array<{ name: string; params?: Record<string, unknown> }> = [];
  if (isNew) {
    events.push({ name: 'session_start', params: { session_id: sessionId, session_number: sessionNumber } });
  }
  events.push({ name, params: baseParams });

  const payload = {
    client_id: cid,
    non_personalized_ads: false,
    events,
  };
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    measurementId
  )}&api_secret=${encodeURIComponent(apiSecret)}`;
  
  // Use sendBeacon to avoid CORS preflight issues
  // Falls back to fetch without Content-Type header if sendBeacon unavailable
  if (navigator.sendBeacon) {
    const success = navigator.sendBeacon(url, JSON.stringify(payload));
    console.log('[ga][mp] sendBeacon:', success ? 'queued' : 'failed');
  } else {
    try {
      // Don't set Content-Type to avoid CORS preflight
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      console.log('[ga][mp] fetch status:', res.status);
    } catch (e) {
      console.warn('[ga][mp] fetch failed', e);
    }
  }
}

export async function trackPageViewMPFallback(page: { page_path: string; page_title?: string; page_location?: string }) {
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;
  const apiSecret = import.meta.env.VITE_GA4_API_SECRET as string | undefined;
  if (!measurementId || !apiSecret) return;
  await sendMeasurementProtocolEvent(measurementId, apiSecret, 'page_view', page);
}

// Legacy alias for backwards compatibility
export const trackPageViewDevFallback = trackPageViewMPFallback;

export function setUserProperties(props: Record<string, string | number | undefined>) {
  if (!window.gtag) return;
  window.gtag('set', 'user_properties', props);
}

export function sendEvent({ action, params }: GtagEvent) {
  if (!window.gtag) return;
  window.gtag('event', action, params);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
