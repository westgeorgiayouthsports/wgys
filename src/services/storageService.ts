import { ref as storageRef, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import logger from '../utils/logger';

export const storageService = {
  async uploadFile(path: string, file: File): Promise<string> {
    try {
      const ref = storageRef(storage, path);
      const snapshot = await uploadBytes(ref, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (error) {
      logger.error('❌ Error uploading file to storage:', error);
      throw error;
    }
  },

  // Upload with progress callback. onProgress receives percent (0-100).
  async uploadFileWithProgress(path: string, file: File, onProgress?: (percent: number) => void): Promise<{ url: string; path: string }> {
    return new Promise((resolve, reject) => {
      try {
        const ref = storageRef(storage, path);
        const task = uploadBytesResumable(ref, file as Blob);
        task.on('state_changed', (snapshot) => {
          if (onProgress && snapshot.totalBytes) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(percent);
          }
        }, (err) => {
          logger.error('Upload failed', err);
          reject(err);
        }, () => {
          getDownloadURL(task.snapshot.ref).then((url) => {
            resolve({ url, path });
          }).catch((e) => {
            reject(e);
          });
        });
      } catch (e) {
        logger.error('uploadFileWithProgress error', e);
        reject(e);
      }
    });
  },

  async deleteFile(path: string): Promise<void> {
    try {
      const ref = storageRef(storage, path);
      await deleteObject(ref);
    } catch (error) {
      logger.error('❌ Error deleting file from storage:', error);
      // don't throw to avoid breaking flows when file is already missing
    }
  },

  async getFileUrl(path: string): Promise<string> {
    try {
      const ref = storageRef(storage, path);
      const url = await getDownloadURL(ref);
      return url;
    } catch (error) {
      logger.error('❌ Error getting download URL:', error);
      throw error;
    }
  }
};
