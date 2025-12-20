import type { RootState } from '../store';
export declare const selectMenuItems: ((state: {
    announcements: import("../slices/announcementsSlice").AnnouncementsState;
    auth: import("../slices/authSlice").AuthState;
    chat: import("../slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
    teams: import("../slices/teamsSlice").TeamsState;
    theme: import("../slices/themeSlice").ThemeState;
}) => any[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: string) => any[];
    memoizedResultFunc: ((resultFuncArgs_0: string) => any[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => any[];
    dependencies: [(state: RootState) => string];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
