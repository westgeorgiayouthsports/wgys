import { ref, push, set, get, query, orderByChild, limitToLast, remove } from 'firebase/database';
import { db, auth } from './firebase';

export type AuditEntity = 'program' | 'team' | 'season' | 'person' | 'family' | 'teamAssignment' | 'other';

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
      await set(newRef, payload);
      return newRef.key;
    } catch (error) {
      console.error('Error writing audit log:', error);
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
      console.error('Error writing delete audit log:', error);
      return null;
    }
  },
};

export default auditLogService;
