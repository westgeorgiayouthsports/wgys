import { ref, push, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';

export const firebaseFilesService = {
  // Add a family file metadata record
  async addFamilyFile(familyId: string, data: {
    fileName: string;
    storagePath: string;
    uploaderId: string;
    uploadedAt?: string;
    size?: number;
    athleteId?: string | null;
    registrationId?: string | null;
  }) {
      const filesRef = ref(db, `familyFiles/${familyId}`);
    const newRef = push(filesRef);
    const record = {
      fileName: data.fileName,
      storagePath: data.storagePath,
      uploaderId: data.uploaderId,
      uploadedAt: data.uploadedAt || new Date().toISOString(),
      size: data.size || null,
      athleteId: data.athleteId || null,
      registrationId: data.registrationId || null,
    };
    await update(newRef, record);
    try {
      await auditLogService.log({ action: 'file.uploaded', entityType: AuditEntity.File, entityId: newRef.key, details: record });
    } catch (e) {
      console.error('Audit log failed for file.uploaded', e);
    }
    return newRef.key as string;
  },

  async getFilesByFamily(familyId: string) {
    const filesRef = ref(db, `familyFiles/${familyId}`);
    const snapshot = await get(filesRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.entries(data).map(([id, v]) => ({ id, ...(v as any) }));
  },

  async deleteFamilyFile(familyId: string, fileId: string) {
    const fileRef = ref(db, `familyFiles/${familyId}/${fileId}`);
    // capture snapshot for audit before deletion
    try {
      const snap = await get(fileRef);
      const before = snap.exists() ? snap.val() : null;
      await remove(fileRef);
      try {
        await auditLogService.log({ action: 'file.deleted', entityType: AuditEntity.File, entityId: fileId, details: { before } });
      } catch (e) {
        console.error('Audit log failed for file.deleted', e);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      await remove(fileRef);
    }
  }
};
