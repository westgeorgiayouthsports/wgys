import type { Event } from '../../services/firebaseEvents';
export interface EventsState {
    events: Event[];
    loading: boolean;
    error: string | null;
}
export declare const fetchTeamEvents: import("@reduxjs/toolkit").AsyncThunk<Event[], string, import("@reduxjs/toolkit").AsyncThunkConfig>;
export declare const fetchAllEvents: import("@reduxjs/toolkit").AsyncThunk<Event[], void, import("@reduxjs/toolkit").AsyncThunkConfig>;
export declare const setEvents: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Event[], "events/setEvents">, addEvent: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Event, "events/addEvent">, updateEvent: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Event, "events/updateEvent">, removeEvent: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "events/removeEvent">, clearError: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"events/clearError">;
declare const _default: import("redux").Reducer<import("immer").WritableDraft<EventsState>>;
export default _default;
