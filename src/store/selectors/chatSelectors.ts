import { createSelector } from 'reselect';
import type { RootState } from '../store';

const selectChatState = (state: RootState) => state.chat;

// Factory function to create memoized selector for a specific teamId
export const makeSelectMessages = (teamId?: string) =>
  createSelector(
    [selectChatState],
    (chat) => {
      if (!chat || !chat.messages) {
        return [];
      }
      const key = teamId || 'global';
      return chat.messages[key] || [];
    }
  );
