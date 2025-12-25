import { onRequest } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) initializeApp();

/**
 * HTTP endpoint for privileged backends to set/clear a user's familyId claim.
 * Protect this endpoint by setting a strong `ADMIN_SECRET` environment variable
 * and only calling it from trusted servers.
 *
 * POST JSON: { userId: string, familyId?: string | null }
 */
export const adminSetFamily = onRequest({ region: 'us-central1', secrets: ['ADMIN_SECRET'] }, async (req: Request, res: Response) => {
  try {
    // The ADMIN_SECRET is provided via Functions Secrets (Secret Manager)
    const secret = process.env.ADMIN_SECRET;

    // Allow three ways to present the secret: Authorization: Bearer <secret>,
    // x-admin-secret header, or admin_secret query param (fallback).
    let incoming: any = undefined;
    const authHeader = req.header('authorization') || req.header('Authorization');
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      incoming = authHeader.slice(7).trim();
    } else {
      incoming = req.header('x-admin-secret') || req.query.admin_secret;
    }
    // Log presence and length for debugging without exposing the secret
    try {
      const present = Boolean(incoming);
      const len = incoming ? String(incoming).length : 0;
      console.warn(`adminSetFamily: incoming header present=${present}, length=${len}`);
    } catch {
      // ignore logging errors
    }

    // Normalize and compare safely
    const secretTrim = typeof secret === 'string' ? secret.trim() : secret;
    const incomingTrim = typeof incoming === 'string' ? incoming.trim() : incoming;
    if (!secretTrim || incomingTrim !== secretTrim) {
      console.warn('adminSetFamily: secret mismatch - returning 403');
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    const { userId, familyId } = req.body || {};
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const auth = getAuth();
    const user = await auth.getUser(userId);
    const current = (user.customClaims as Record<string, any>) || {};

    if (familyId === null || familyId === '') {
      const { familyId: _removed, ...rest } = current;
      await auth.setCustomUserClaims(userId, rest);
      res.json({ success: true, cleared: true });
      return;
    }

    if (typeof familyId !== 'string') {
      res.status(400).json({ error: 'familyId must be a string or null' });
      return;
    }

    const merged = { ...current, familyId };
    await auth.setCustomUserClaims(userId, merged);
    res.json({ success: true, userId, familyId: merged.familyId });
  } catch (err: any) {
    console.error('adminSetFamily error:', err);
    res.status(500).json({ error: 'internal' });
  }
});
