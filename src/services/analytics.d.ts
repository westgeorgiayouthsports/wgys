type GtagEvent = {
    action: string;
    params?: Record<string, unknown>;
};
export declare function initAnalytics(measurementId: string | undefined): void;
export declare function trackPageView(page: {
    page_path: string;
    page_title?: string;
    page_location?: string;
}): void;
export declare function trackPageViewMPFallback(page: {
    page_path: string;
    page_title?: string;
    page_location?: string;
}): Promise<void>;
export declare const trackPageViewDevFallback: typeof trackPageViewMPFallback;
export declare function setUserProperties(props: Record<string, string | number | undefined>): void;
export declare function sendEvent({ action, params }: GtagEvent): void;
declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}
export {};
