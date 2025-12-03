export interface Message {
    id: string;
    userId: string;
    userEmail: string;
    text: string;
    timestamp: string;
    read: boolean;
}
export interface ChatState {
    messages: Message[];
    loading: boolean;
    error: string | null;
}
export declare const setLoading: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<boolean, "chat/setLoading">, setMessages: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Message[], "chat/setMessages">, addMessage: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Message, "chat/addMessage">, deleteMessage: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "chat/deleteMessage">, setError: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "chat/setError">;
declare const _default: import("redux").Reducer<ChatState>;
export default _default;
