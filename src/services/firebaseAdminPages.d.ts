export interface AdminPage {
    content: string;
    updatedBy: string;
    updatedAt: string;
}
export declare const adminPagesService: {
    getPage(pageName: "about" | "policies" | "rules"): Promise<AdminPage | null>;
    getAllPages(): Promise<Record<string, AdminPage>>;
    updatePage(pageName: "about" | "policies" | "rules", content: string, userId: string): Promise<void>;
    getPageHistory(pageName: "about" | "policies" | "rules"): Promise<AdminPage[]>;
    initializeDefaultPages(userId: string): Promise<void>;
};
