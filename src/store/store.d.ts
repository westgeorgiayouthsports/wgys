export declare const store: import("@reduxjs/toolkit").EnhancedStore<{
    announcements: import("./slices/announcementsSlice").AnnouncementsState;
    auth: import("./slices/authSlice").AuthState;
    chat: import("./slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("./slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("./slices/registrationsSlice").RegistrationsState>;
    teams: import("./slices/teamsSlice").TeamsState;
    theme: import("./slices/themeSlice").ThemeState;
}, import("redux").UnknownAction, import("@reduxjs/toolkit").Tuple<[import("redux").StoreEnhancer<{
    dispatch: import("redux-thunk").ThunkDispatch<{
        announcements: import("./slices/announcementsSlice").AnnouncementsState;
        auth: import("./slices/authSlice").AuthState;
        chat: import("./slices/chatSlice").ChatState;
        events: import("immer").WritableDraft<import("./slices/eventsSlice").EventsState>;
        registrations: import("immer").WritableDraft<import("./slices/registrationsSlice").RegistrationsState>;
        teams: import("./slices/teamsSlice").TeamsState;
        theme: import("./slices/themeSlice").ThemeState;
    }, undefined, import("redux").UnknownAction>;
}>, import("redux").StoreEnhancer]>>;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
