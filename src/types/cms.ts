export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CMSState {
  pages: CMSPage[];
  currentPage: CMSPage | null;
  loading: boolean;
  error: string | null;
}
