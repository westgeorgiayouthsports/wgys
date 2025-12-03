import { ref, push, get, set } from 'firebase/database';
import { db } from './firebase';

export interface Comment {
  id: string;
  text: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

export const commentsService = {
  async addComment(announcementId: string, comment: Omit<Comment, 'id'>): Promise<Comment> {
    const commentsRef = ref(db, `comments/${announcementId}`);
    const newCommentRef = push(commentsRef);
    
    const commentWithId: Comment = {
      ...comment,
      id: newCommentRef.key,
    };
    
    await set(newCommentRef, commentWithId);
    return commentWithId;
  },

  async getComments(announcementId: string): Promise<Comment[]> {
    const commentsRef = ref(db, `comments/${announcementId}`);
    const snapshot = await get(commentsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const commentsData = snapshot.val();
    return Object.values(commentsData);
  }
};