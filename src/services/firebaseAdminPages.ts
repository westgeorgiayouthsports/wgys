import { ref, set, get } from 'firebase/database';
import { db } from './firebase';

export interface AdminPage {
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export const adminPagesService = {
  // Get specific page (about, policies, rules)
  async getPage(
    pageName: 'about' | 'policies' | 'rules'
  ): Promise<AdminPage | null> {
    try {
      const pageRef = ref(db, `adminPages/${pageName}`);
      const snapshot = await get(pageRef);

      if (!snapshot.exists()) return null;

      return snapshot.val() as AdminPage;
    } catch (error) {
      console.error(`❌ Error fetching ${pageName} page:`, error);
      throw error;
    }
  },

  // Get all admin pages
  async getAllPages(): Promise<Record<string, AdminPage>> {
    try {
      const _pagesRef = ref(db, 'adminPages');
      const snapshot = await get(_pagesRef);

      if (!snapshot.exists()) return {};

      return snapshot.val() as Record<string, AdminPage>;
    } catch (error) {
      console.error('❌ Error fetching all admin pages:', error);
      throw error;
    }
  },

  // Update page content
  async updatePage(
    pageName: 'about' | 'policies' | 'rules',
    content: string,
    userId: string
  ): Promise<void> {
    try {
      const pageRef = ref(db, `adminPages/${pageName}`);

      await set(pageRef, {
        content,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ Error updating ${pageName} page:`, error);
      throw error;
    }
  },

  // Get page version history (optional - for future enhancement)
  async getPageHistory(
    pageName: 'about' | 'policies' | 'rules'
  ): Promise<AdminPage[]> {
    try {
      // Note: Firebase Realtime DB doesn't have built-in versioning
      // You would need to maintain a separate history collection
      const historyRef = ref(db, `pageHistory/${pageName}`);
      const snapshot = await get(historyRef);

      if (!snapshot.exists()) return [];

      const history: AdminPage[] = [];
      snapshot.forEach((child) => {
        const page = child.val() as AdminPage;
        history.push(page);
      });

      return history.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error(`❌ Error fetching ${pageName} page history:`, error);
      throw error;
    }
  },

  // Initialize default pages (call once during setup)
  async initializeDefaultPages(userId: string): Promise<void> {
    try {
      const defaultPages = {
        about: {
          content: '<h1>About WGYS</h1><p>Welcome to West Georgia Youth Sports. We are committed to providing quality youth sports experiences.</p>',
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        },
        policies: {
          content: '<h1>Policies</h1><p>Please review our organization policies:</p><ul><li>Code of Conduct</li><li>Safety Guidelines</li><li>Participation Requirements</li></ul>',
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        },
        rules: {
          content: '<h1>Rules & Regulations</h1><p>All participants must follow our rules and regulations. See NFHS rules for specific sport guidelines.</p>',
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        },
      };

      

      for (const [pageName, pageContent] of Object.entries(defaultPages)) {
        const pageRef = ref(db, `adminPages/${pageName}`);
        const snapshot = await get(pageRef);

        // Only initialize if page doesn't exist
        if (!snapshot.exists()) {
          await set(pageRef, pageContent);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing default pages:', error);
      throw error;
    }
  },
};
