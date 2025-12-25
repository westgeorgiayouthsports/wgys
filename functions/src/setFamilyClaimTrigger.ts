import * as functions from 'firebase-functions';
const fbFunctions: any = functions;
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Admin SDK if not already
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Trigger: when a person record changes, ensure the linked Auth user has a
 * `familyId` custom claim that matches `people/{personId}.familyId`.
 *
 * This uses the v2 RTDB trigger helper `ref(...).onWrite(event => ...)`.
 */
export const onPersonRecordChange = fbFunctions.database
  .ref('/people/{personId}')
  .onWrite(async (change: any, _context: any) => {
    try {
      const afterExists = change.after && typeof change.after.exists === 'function' ? change.after.exists() : Boolean(change.after);
      const beforeExists = change.before && typeof change.before.exists === 'function' ? change.before.exists() : Boolean(change.before);
      const person = afterExists ? change.after.val() : (beforeExists ? change.before.val() : null);
      if (!person) return null;

      const userId = person.userId;
      const familyId = person.familyId ?? null;
      if (!userId) return null; // nothing to do until account linked

      const auth = getAuth();
      const user = await auth.getUser(userId);
      const currentClaims = (user.customClaims as Record<string, any>) || {};

      if (!familyId) {
        const { familyId: _removed, ...remaining } = currentClaims;
        await auth.setCustomUserClaims(userId, remaining);
        return null;
      }

      // Set/overwrite familyId claim
      const merged = { ...currentClaims, familyId };
      await auth.setCustomUserClaims(userId, merged);
      return null;
    } catch (err) {
      console.error('onPersonRecordChange error:', err);
      return null;
    }
  });
