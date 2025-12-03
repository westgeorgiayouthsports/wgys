import type { Announcement } from '../store/slices/announcementsSlice';
export declare const announcementsService: {
    getAnnouncements(userId?: string): Promise<Announcement[]>;
    createAnnouncement(userId: string, userEmail: string, title: string, content: string, showOnFeed?: boolean, allowComments?: boolean): Promise<Announcement>;
    updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void>;
    publishAnnouncement(id: string): Promise<void>;
    deleteAnnouncement(id: string): Promise<void>;
    getAllPublishedAnnouncements(): Promise<Announcement[]>;
    incrementViews(id: string): Promise<void>;
};
