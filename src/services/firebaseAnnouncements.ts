import { ref, push, set, get, remove, query, orderByChild, equalTo, runTransaction } from 'firebase/database';
import { db } from './firebase';
import type { Announcement } from '../store/slices/announcementsSlice';

export const announcementsService = {
  // Get all announcements (published only for non-authors)
  async getAnnouncements(userId?: string): Promise<Announcement[]> {
    try {
      const announcementsRef = ref(db, 'announcements');
      const snapshot = await get(announcementsRef);
      
      if (!snapshot.exists()) return [];
      
      const announcements: Announcement[] = [];
      snapshot.forEach((child) => {
        const announcement = { id: child.key, ...child.val() } as Announcement;
        if (userId) {
          // Show all for current user + published from others
          if (announcement.userId === userId || announcement.status === 'published') {
            announcements.push(announcement);
          }
        } else {
          // Show only published
          if (announcement.status === 'published') {
            announcements.push(announcement);
          }
        }
      });
      
      return announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  },

  // Create announcement (draft by default)
  async createAnnouncement(
    userId: string,
    userEmail: string,
    title: string,
    content: string,
    showOnFeed = true,
    allowComments = true
  ): Promise<Announcement> {
    try {
      const announcementsRef = ref(db, 'announcements');
      const newAnnouncementRef = push(announcementsRef);
      const announcement = {
        title,
        content,
        userId,
        userEmail,
        authorEmail: userEmail,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        views: 0,
        showOnFeed,
        allowComments,
      };
      await set(newAnnouncementRef, announcement);
      return {
        id: newAnnouncementRef.key,
        ...announcement,
      };
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  },

  // Update announcement
  async updateAnnouncement(
    id: string,
    updates: Partial<Announcement>
  ): Promise<void> {
    try {
      const announcementRef = ref(db, `announcements/${id}`);
      const snapshot = await get(announcementRef);
      if (snapshot.exists()) {
        await set(announcementRef, { ...snapshot.val(), ...updates });
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  },

  // Publish announcement
  async publishAnnouncement(id: string): Promise<void> {
    try {
      const announcementRef = ref(db, `announcements/${id}`);
      const snapshot = await get(announcementRef);
      if (snapshot.exists()) {
        await set(announcementRef, {
          ...snapshot.val(),
          status: 'published',
          publishedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error publishing announcement:', error);
      throw error;
    }
  },

  // Delete announcement
  async deleteAnnouncement(id: string): Promise<void> {
    try {
      const announcementRef = ref(db, `announcements/${id}`);
      await remove(announcementRef);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  },

  // Get all published announcements (for read-only view)
  async getAllPublishedAnnouncements(): Promise<Announcement[]> {
    try {
      const announcementsRef = ref(db, 'announcements');
      const snapshot = await get(announcementsRef);
      
      if (!snapshot.exists()) return [];
      
      const announcements: Announcement[] = [];
      snapshot.forEach((child) => {
        const announcement = { id: child.key, ...child.val() } as Announcement;
        if (announcement.status === 'published') {
          announcements.push(announcement);
        }
      });
      
      return announcements.sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.createdAt).getTime();
        const dateB = new Date(b.publishedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching published announcements:', error);
      throw error;
    }
  },

  // Increment views
  async incrementViews(id: string): Promise<void> {
    try {
      const viewsRef = ref(db, `announcements/${id}/views`);
      await runTransaction(viewsRef, (currentViews) => {
        return (currentViews || 0) + 1;
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
      throw error;
    }
  },
};