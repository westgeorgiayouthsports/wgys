import type { CMSPage } from '../types/cms';
export declare const createPage: (pageData: Omit<CMSPage, "id" | "createdAt" | "updatedAt">) => Promise<string>;
export declare const updatePage: (pageId: string, pageData: Partial<CMSPage>) => Promise<void>;
export declare const deletePage: (pageId: string) => Promise<void>;
export declare const getPages: () => Promise<CMSPage[]>;
export declare const getPageBySlug: (slug: string) => Promise<CMSPage | null>;
export declare const getPageById: (pageId: string) => Promise<CMSPage | null>;
