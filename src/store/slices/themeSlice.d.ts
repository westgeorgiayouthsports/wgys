export interface ThemeState {
    isDarkMode: boolean;
}
export declare const toggleTheme: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"theme/toggleTheme">, setTheme: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<boolean, "theme/setTheme">;
declare const _default: import("redux").Reducer<ThemeState>;
export default _default;
