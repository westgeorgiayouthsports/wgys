import { ref, push, set, remove, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import type { CMSPage } from '../types/cms';

export const createPage = async (pageData: Omit<CMSPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const pagesRef = ref(db, 'cms/pages');
  const newPageRef = push(pagesRef);
  await set(newPageRef, {
    ...pageData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!newPageRef.key) throw new Error('Failed to generate page ID');
  return newPageRef.key;
};

export const updatePage = async (pageId: string, pageData: Partial<CMSPage>): Promise<void> => {
  const pageRef = ref(db, `cms/pages/${pageId}`);
  const snapshot = await get(pageRef);
  if (snapshot.exists()) {
    await set(pageRef, {
      ...snapshot.val(),
      ...pageData,
      updatedAt: new Date().toISOString(),
    });
  } else {
    throw new Error('Page not found');
  }
};

export const deletePage = async (pageId: string): Promise<void> => {
  const pageRef = ref(db, `cms/pages/${pageId}`);
  await remove(pageRef);
};

export const getPages = async (): Promise<CMSPage[]> => {
  const pagesRef = ref(db, 'cms/pages');
  const snapshot = await get(pagesRef);
  if (!snapshot.exists()) return [];
  
  const pages: CMSPage[] = [];
  snapshot.forEach((child) => {
    if (child.key) {
      pages.push({ id: child.key, ...child.val() });
    }
  });
  return pages;
};

export const getPageBySlug = async (slug: string): Promise<CMSPage | null> => {
  const pagesRef = ref(db, 'cms/pages');
  const q = query(pagesRef, orderByChild('slug'), equalTo(slug));
  const snapshot = await get(q);
  
  if (!snapshot.exists()) return null;
  
  let page: CMSPage | null = null;
  snapshot.forEach((child) => {
    page = { id: child.key, ...child.val() };
  });
  return page;
};

export const getPageById = async (pageId: string): Promise<CMSPage | null> => {
  const pageRef = ref(db, `cms/pages/${pageId}`);
  const snapshot = await get(pageRef);
  return snapshot.exists() ? { id: pageId, ...snapshot.val() } : null;
};
