import { ref, push, set, get, query, orderByChild, limitToLast, remove } from 'firebase/database';
import { db, auth } from './firebase';
import { AuditEntity } from '../types/enums';
import logger from '../utils/logger';

export interface AuditRecord {
  id?: string;
  action: string; // e.g., 'program.moved', 'season.archived', 'team.created'
  entityType: AuditEntity;
  entityId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  details?: any;
  timestamp: string;
}

const auditRefPath = 'auditLogs';

export const auditLogService = {
  async log(record: Omit<AuditRecord, 'id' | 'timestamp'>) {
    try {
      const now = new Date().toISOString();
      const newRef = push(ref(db, auditRefPath));
      const user = auth.currentUser;
      const payload: AuditRecord = {
        ...record,
        actorId: record.actorId ?? user?.uid ?? null,
        actorEmail: record.actorEmail ?? (user?.email ?? null),
        timestamp: now,
      };
      // Sanitize details: Firebase Realtime Database rejects `undefined` values.
      const sanitize = (v: any): any => {
        if (v === undefined) return null;
        if (v === null) return null;
        if (Array.isArray(v)) return v.map(sanitize);
        if (typeof v === 'object') {
          const out: any = {};
          for (const [k, val] of Object.entries(v)) {
            if (val === undefined) continue; // drop undefined properties
            out[k] = sanitize(val);
          }
          return out;
        }
        return v;
      };
      if (payload.details !== undefined) {
        try {
          payload.details = sanitize(payload.details);
        } catch (e) {
          // fallback: stringify to preserve something readable
          logger.info('Error sanitizing audit log details, falling back to stringification', e);
          payload.details = String(payload.details);
        }
      }
      await set(newRef, payload);
      return newRef.key;
    } catch (error) {
      console.error(`Error writing audit entry: `, error || 'unknown error');
      // don't throw; audit failures should not block main flow
      return null;
    }
  },

  async getLogs(limit = 500) {
    try {
      const logsRef = ref(db, auditRefPath);
      const q = query(logsRef, orderByChild('timestamp'), limitToLast(limit));
      const snap = await get(q);
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data).map(([id, rec]: [string, any]) => ({ id, ...rec }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  },

  async deleteLog(id: string) {
    try {
      if (!id) return false;
      await remove(ref(db, `${auditRefPath}/${id}`));
      return true;
    } catch (error) {
      console.error('Error deleting audit log:', error);
      return false;
    }
  },

  // convenience helper for bulk actions
  async logBulk(action: string, entityType: AuditEntity, entityIds: string[], details?: any) {
    return this.log({ action, entityType, entityId: null, details: { ids: entityIds, ...details } });
  },

  // helper to log deletions with a snapshot of the record before removal
  async logDelete(entityType: AuditEntity, entityId: string | null, beforeData?: any, actorId?: string | null) {
    try {
      return await this.log({
        action: `${entityType}.deleted`,
        entityType,
        entityId: entityId ?? null,
        actorId: actorId ?? undefined,
        details: { before: beforeData ?? null },
      });
    } catch (error) {
      console.error(`Error writing delete audit entry for ${entityType}.deleted:`, error || 'unknown error');
      return null;
    }
  },
};

export default auditLogService;
