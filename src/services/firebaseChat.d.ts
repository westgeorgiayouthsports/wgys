import type { Message } from '../store/slices/chatSlice';
export declare const chatService: {
    getMessages(): Promise<Message[]>;
    sendMessage(userId: string, userEmail: string, text: string): Promise<Message>;
    subscribeToMessages(callback: (messages: Message[]) => void): import("@firebase/database").Unsubscribe;
    deleteMessage(id: string): Promise<void>;
};
