export interface Comment {
    id: string;
    text: string;
    userName: string;
    userEmail: string;
    createdAt: string;
}
export declare const commentsService: {
    addComment(announcementId: string, comment: Omit<Comment, "id">): Promise<Comment>;
    getComments(announcementId: string): Promise<Comment[]>;
};
