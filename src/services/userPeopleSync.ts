import { ref, get, update as _update } from 'firebase/database';
import { db } from './firebase';
import { peopleService } from './firebasePeople';
import type { PersonFormData } from '../types/person';

export const userPeopleSync = {
  /**
   * Sync users collection with people collection
   * Creates people records for users who don't have them
   */
  async syncUsersWithPeople(): Promise<{ created: number; linked: number; errors: string[] }> {
    const results = { created: 0, linked: 0, errors: [] as string[] };
    
    try {
      // Get all users
      const usersRef = ref(db, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (!usersSnapshot.exists()) {
        return results;
      }
      
      // Get all people
      const people = await peopleService.getPeople();
      const peopleByUserId = new Map(
        people.filter(p => p.userId).map(p => [p.userId!, p])
      );
      
      const users = usersSnapshot.val();
      
      for (const [uid, userData] of Object.entries(users)) {
        try {
          const existingPerson = peopleByUserId.get(uid);
          
          if (!existingPerson) {
            // Create person record for user
            const personData: PersonFormData = {
              firstName: (userData as any).displayName?.split(' ')[0] || 'User',
              lastName: (userData as any).displayName?.split(' ').slice(1).join(' ') || '',
              email: (userData as any).email || '',
              roles: ['parent'], // Default role for account holders
            };
            
            const newPersonId = await peopleService.createPerson(personData, uid);
            await peopleService.linkPersonToAccount(newPersonId, uid);
            
            results.created++;
          } else if (!existingPerson.hasAccount) {
            // Link existing person to account
            await peopleService.linkPersonToAccount(existingPerson.id, uid);
            results.linked++;
          }
        } catch (error) {
          console.error(`Error syncing user ${uid}:`, error);
          results.errors.push(`Failed to sync user ${uid}: ${error}`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error syncing users with people:', error);
      results.errors.push(`Sync failed: ${error}`);
      return results;
    }
  },

  /**
   * Get users who don't have corresponding people records
   */
  async getUnlinkedUsers(): Promise<{ uid: string; email: string; displayName: string }[]> {
    try {
      const usersRef = ref(db, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (!usersSnapshot.exists()) {
        return [];
      }
      
      const people = await peopleService.getPeople();
      const linkedUserIds = new Set(people.filter(p => p.userId).map(p => p.userId));
      
      const users = usersSnapshot.val();
      const unlinkedUsers = [];
      
      for (const [uid, userData] of Object.entries(users)) {
        if (!linkedUserIds.has(uid)) {
          unlinkedUsers.push({
            uid,
            email: (userData as any).email || 'No email',
            displayName: (userData as any).displayName || 'Unknown User'
          });
        }
      }
      
      return unlinkedUsers;
    } catch (error) {
      console.error('Error getting unlinked users:', error);
      return [];
    }
  }
};