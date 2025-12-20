type GtagEvent = {
  action: string;
  params?: Record<string, unknown>;
};

let analyticsInitialized = false;

function loadGtag(measurementId: string) {
  if (analyticsInitialized) return;
  if (!measurementId) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  }

  (window as any).gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: false });
  analyticsInitialized = true;
}

export function initAnalytics(measurementId: string | undefined) {
  // console.log('[ga] measurementId', measurementId);
  if (!measurementId) return;
  loadGtag(measurementId);
  // console.log('[ga] gtag initialized');
  
  // Send a test event to verify GA is working
  // setTimeout(() => {
  //   if (window.gtag) {
  //     window.gtag('event', 'app_initialized', { debug_mode: true });
  //     console.log('[ga] test event sent');
  //   }
  // }, 1000);
}

export function trackPageView(page: { page_path: string; page_title?: string; page_location?: string }) {
  if (!window.gtag) return;
  // console.log('[ga] trackPageView', page.page_path);
  window.gtag('event', 'page_view', page);
}

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
