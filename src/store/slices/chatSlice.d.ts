export interface Message {
    id: string;
    userId: string;
    userEmail: string;
    text: string;
    timestamp: string;
    read: boolean;
}
export interface ChatState {
    messages: Record<string, Message[]>;
    loading: Record<string, boolean>;
    error: Record<string, string | null>;
}
export declare const setLoading: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    teamId?: string;
    loading: boolean;
}, "chat/setLoading">, setMessages: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    teamId?: string;
    messages: Message[];
}, "chat/setMessages">, addMessage: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    teamId?: string;
    message: Message;
}, "chat/addMessage">, deleteMessage: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    teamId?: string;
    id: string;
}, "chat/deleteMessage">, setError: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    teamId?: string;
    error: string | null;
}, "chat/setError">;
declare const _default: import("redux").Reducer<ChatState>;
export default _default;
