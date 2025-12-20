import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const storageService = {
  async uploadFile(path: string, file: File): Promise<string> {
    try {
      const ref = storageRef(storage, path);
      const snapshot = await uploadBytes(ref, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (error) {
      console.error('❌ Error uploading file to storage:', error);
      throw error;
    }
  },
};
