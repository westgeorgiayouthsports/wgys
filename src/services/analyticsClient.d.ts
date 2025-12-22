export type WebsiteViewsResponse = {
    views: number;
};
export declare function fetchWebsiteViews(): Promise<number>;
export declare function fetchWebsiteMetrics(): Promise<{
    views: number;
    healthy: boolean;
}>;
