export type ViewsSource = 'standard' | 'eventCount' | 'realtime';
export type WebsiteViewsResponse = {
    views: number;
    realtimeViews?: number;
    source?: ViewsSource;
    timeseries?: Array<{
        date: string;
        views: number;
        source?: ViewsSource;
    }>;
};
export declare function fetchWebsiteViews(): Promise<number>;
export declare function fetchWebsiteMetrics(): Promise<{
    views: number;
    healthy: boolean;
    realtimeViews?: number;
    source?: WebsiteViewsResponse['source'];
}>;
export declare function fetchWebsiteTrends(days?: number): Promise<{
    timeseries: NonNullable<WebsiteViewsResponse['timeseries']>;
    source?: ViewsSource;
    healthy: boolean;
}>;
