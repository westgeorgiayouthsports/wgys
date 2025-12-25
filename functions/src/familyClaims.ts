import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Ensure Admin SDK is initialized exactly once
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Callable function to set or clear the `familyId` custom claim for a user.
 *
 * Required input: { userId: string, familyId?: string | null }
 * - To set claim: provide a non-empty `familyId` string.
 * - To clear claim: provide `familyId: null` or an empty string.
 *
 * Security: This function should only be called by privileged actors (admins).
 * It verifies the caller has an `admin` or `isAdmin` custom claim on their token.
 */
export const setFamilyClaim = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const callerClaims = (req.auth?.token as Record<string, any>) || {};

    // Only allow privileged callers (adjust claim name to match your deployment).
    const allowed = Boolean(callerClaims.admin || callerClaims.isAdmin || callerClaims.superadmin);
    if (!allowed) {
      throw new HttpsError('permission-denied', 'Caller must be an admin to set custom claims');
    }

    const userId = (req.data?.userId as string) || '';
    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required');
    }

    // familyId may be string or null/undefined to clear
    const familyId = req.data?.familyId;

    const auth = getAuth();

    // Read existing claims to merge safely
    const user = await auth.getUser(userId);
    const currentClaims = (user.customClaims as Record<string, any>) || {};

    if (familyId === null || familyId === '') {
      // Remove familyId from claims
      const { familyId: _removed, ...rest } = currentClaims;
      await auth.setCustomUserClaims(userId, rest);
      return { success: true, cleared: true };
    }

    if (typeof familyId !== 'string') {
      throw new HttpsError('invalid-argument', 'familyId must be a string, null, or omitted');
    }

    const newClaims = { ...currentClaims, familyId };
    await auth.setCustomUserClaims(userId, newClaims);

    return { success: true, userId, familyId };
  } catch (err: any) {
    console.error('setFamilyClaim error:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Failed to set family claim');
  }
});
