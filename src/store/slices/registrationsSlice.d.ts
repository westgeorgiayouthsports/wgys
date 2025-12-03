import type { Registration } from '../../services/firebaseRegistrations';
export interface RegistrationsState {
    registrations: Registration[];
    loading: boolean;
    error: string | null;
}
export declare const fetchTeamRegistrations: import("@reduxjs/toolkit").AsyncThunk<Registration[], string, import("@reduxjs/toolkit").AsyncThunkConfig>;
export declare const fetchAllRegistrations: import("@reduxjs/toolkit").AsyncThunk<Registration[], void, import("@reduxjs/toolkit").AsyncThunkConfig>;
export declare const setRegistrations: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Registration[], "registrations/setRegistrations">, addRegistration: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Registration, "registrations/addRegistration">, updateRegistration: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Registration, "registrations/updateRegistration">, removeRegistration: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "registrations/removeRegistration">, clearError: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"registrations/clearError">;
declare const _default: import("redux").Reducer<import("immer").WritableDraft<RegistrationsState>>;
export default _default;
