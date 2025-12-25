import { ref, push, set, get, remove } from 'firebase/database';
import { db } from './firebase';

import type { EventType } from '../types';

export interface Event {
  id: string;
  teamId: string;
  title: string;
  type: EventType;
  date: string;
  location: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export const eventsService = {
  // Get all events for a team
  async getTeamEvents(teamId: string): Promise<Event[]> {
    try {
      const eventsRef = ref(db, 'events');
      const snapshot = await get(eventsRef);

      if (!snapshot.exists()) return [];

      const events: Event[] = [];
      snapshot.forEach((child) => {
        const event = { id: child.key, ...child.val() } as Event;
        if (event.teamId === teamId) {
          events.push(event);
        }
      });

      return events.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching team events:', error);
      throw error;
    }
  },

  // Get all events
  async getAllEvents(): Promise<Event[]> {
    try {
      const eventsRef = ref(db, 'events');
      const snapshot = await get(eventsRef);

      if (!snapshot.exists()) return [];

      const events: Event[] = [];
      snapshot.forEach((child) => {
        const event = { id: child.key, ...child.val() } as Event;
        events.push(event);
      });

      return events.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching all events:', error);
      throw error;
    }
  },

  // Create event
  async createEvent(
    teamId: string,
    title: string,
    type: EventType,
    date: string,
    location: string,
    description: string
  ): Promise<Event> {
    try {
      const eventsRef = ref(db, 'events');
      const newEventRef = push(eventsRef);

      const event = {
        teamId,
        title,
        type,
        date,
        location,
        description,
        createdAt: new Date().toISOString(),
      };

      await set(newEventRef, event);

      return {
        id: newEventRef.key,
        ...event,
      };
    } catch (error) {
      console.error('❌ Error creating event:', error);
      throw error;
    }
  },

  // Update event
  async updateEvent(
    id: string,
    updates: Partial<Omit<Event, 'id'>>
  ): Promise<void> {
    try {
      const eventRef = ref(db, `events/${id}`);
      const snapshot = await get(eventRef);

      if (snapshot.exists()) {
        await set(eventRef, {
          ...snapshot.val(),
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Error updating event:', error);
      throw error;
    }
  },

  // Delete event
  async deleteEvent(id: string): Promise<void> {
    try {
      const eventRef = ref(db, `events/${id}`);
      await remove(eventRef);
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      throw error;
    }
  },
};
