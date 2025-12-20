import type { Message } from '../store/slices/chatSlice';
type MessageCallback = (messages: Message[]) => void;
export declare const chatService: {
    _messagesPath(teamId?: string): string;
    getMessages(teamId?: string): Promise<Message[]>;
    sendMessage(userId: string, userEmail: string, text: string, teamId?: string): Promise<Message>;
    subscribeToMessages(callback: MessageCallback, teamId?: string): import("@firebase/database").Unsubscribe;
    deleteMessage(id: string, teamId?: string): Promise<void>;
};
export {};
