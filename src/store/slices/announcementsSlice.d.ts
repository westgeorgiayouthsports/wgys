export interface Announcement {
    id: string;
    title: string;
    content: string;
    userId: string;
    userEmail: string;
    authorEmail: string;
    status: 'draft' | 'published';
    createdAt: string;
    publishedAt?: string;
    views: number;
    showOnFeed?: boolean;
    allowComments?: boolean;
    commentCount?: number;
}
export interface AnnouncementsState {
    announcements: Announcement[];
    loading: boolean;
    error: string | null;
}
export declare const setLoading: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<boolean, "announcements/setLoading">, setAnnouncements: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Announcement[], "announcements/setAnnouncements">, addAnnouncement: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Announcement, "announcements/addAnnouncement">, updateAnnouncement: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Announcement, "announcements/updateAnnouncement">, deleteAnnouncement: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "announcements/deleteAnnouncement">, incrementViews: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "announcements/incrementViews">, setError: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "announcements/setError">;
declare const _default: import("redux").Reducer<AnnouncementsState>;
export default _default;
