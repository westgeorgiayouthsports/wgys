import type { RootState } from '../store';
import type { AuthState, User } from '../slices/authSlice';
export declare const selectUser: ((state: {
    announcements: import("../slices/announcementsSlice").AnnouncementsState;
    auth: AuthState;
    chat: import("../slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
    teams: import("../slices/teamsSlice").TeamsState;
    theme: import("../slices/themeSlice").ThemeState;
}) => User) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: AuthState) => User;
    memoizedResultFunc: ((resultFuncArgs_0: AuthState) => User) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => User;
    dependencies: [(state: RootState) => AuthState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectRole: ((state: {
    announcements: import("../slices/announcementsSlice").AnnouncementsState;
    auth: AuthState;
    chat: import("../slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
    teams: import("../slices/teamsSlice").TeamsState;
    theme: import("../slices/themeSlice").ThemeState;
}) => string) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: AuthState) => string;
    memoizedResultFunc: ((resultFuncArgs_0: AuthState) => string) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string;
    dependencies: [(state: RootState) => AuthState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectIsAuthenticated: ((state: {
    announcements: import("../slices/announcementsSlice").AnnouncementsState;
    auth: AuthState;
    chat: import("../slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
    teams: import("../slices/teamsSlice").TeamsState;
    theme: import("../slices/themeSlice").ThemeState;
}) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: AuthState) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: AuthState) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [(state: RootState) => AuthState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectAuthLoading: ((state: {
    announcements: import("../slices/announcementsSlice").AnnouncementsState;
    auth: AuthState;
    chat: import("../slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
    teams: import("../slices/teamsSlice").TeamsState;
    theme: import("../slices/themeSlice").ThemeState;
}) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: AuthState) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: AuthState) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [(state: RootState) => AuthState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectIsAdmin: ((state: {
    announcements: import("../slices/announcementsSlice").AnnouncementsState;
    auth: AuthState;
    chat: import("../slices/chatSlice").ChatState;
    events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
    registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
    teams: import("../slices/teamsSlice").TeamsState;
    theme: import("../slices/themeSlice").ThemeState;
}) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: string) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: string) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [((state: {
        announcements: import("../slices/announcementsSlice").AnnouncementsState;
        auth: AuthState;
        chat: import("../slices/chatSlice").ChatState;
        events: import("immer").WritableDraft<import("../slices/eventsSlice").EventsState>;
        registrations: import("immer").WritableDraft<import("../slices/registrationsSlice").RegistrationsState>;
        teams: import("../slices/teamsSlice").TeamsState;
        theme: import("../slices/themeSlice").ThemeState;
    }) => string) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: AuthState) => string;
        memoizedResultFunc: ((resultFuncArgs_0: AuthState) => string) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => string;
        dependencies: [(state: RootState) => AuthState];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        memoize: typeof import("reselect").weakMapMemoize;
        argsMemoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
