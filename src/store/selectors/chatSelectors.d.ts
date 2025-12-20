import type { RootState } from '../store';
export declare const makeSelectMessages: (teamId?: string) => ((state: {
    announcements: import("../slices/announcementsSlice").AnnouncementsState;
    auth: import("../slices/authSlice").AuthState;
    chat: import("../slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
    teams: import("../slices/teamsSlice").TeamsState;
    theme: import("../slices/themeSlice").ThemeState;
}) => import("../slices/chatSlice").Message[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("../slices/chatSlice").ChatState) => import("../slices/chatSlice").Message[];
    memoizedResultFunc: ((resultFuncArgs_0: import("../slices/chatSlice").ChatState) => import("../slices/chatSlice").Message[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => import("../slices/chatSlice").Message[];
    dependencies: [(state: RootState) => import("../slices/chatSlice").ChatState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
