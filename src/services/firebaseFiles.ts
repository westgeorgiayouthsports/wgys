import { ref, push, get, update, remove } from 'firebase/database';
import { db } from './firebase';

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
    const filesRef = ref(db, `family_files/${familyId}`);
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
    return newRef.key as string;
  },

  async getFilesByFamily(familyId: string) {
    const filesRef = ref(db, `family_files/${familyId}`);
    const snapshot = await get(filesRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.entries(data).map(([id, v]) => ({ id, ...(v as any) }));
  },

  async deleteFamilyFile(familyId: string, fileId: string) {
    const fileRef = ref(db, `family_files/${familyId}/${fileId}`);
    await remove(fileRef);
  }
};
