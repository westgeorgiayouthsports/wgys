import { ref, push, set, get, remove } from 'firebase/database';
import { db } from './firebase';

export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  registrationId?: string;
  joinedAt: string;
}

export const rostersService = {
  // Get team roster
  async getTeamRoster(teamId: string): Promise<Player[]> {
    try {
      const rosterRef = ref(db, `rosters/${teamId}`);
      const snapshot = await get(rosterRef);

      if (!snapshot.exists()) return [];

      const players: Player[] = [];
      snapshot.forEach((child) => {
        const player = { id: child.key!, ...child.val() } as Player;
        players.push(player);
      });

      return players.sort((a, b) => a.number - b.number);
    } catch (error) {
      console.error('❌ Error fetching team roster:', error);
      throw error;
    }
  },

  // Add player to roster
  async addPlayer(
    teamId: string,
    name: string,
    number: number,
    position: string,
    registrationId?: string
  ): Promise<Player> {
    try {
      const rosterRef = ref(db, `rosters/${teamId}`);
      const newPlayerRef = push(rosterRef);

      const player = {
        name,
        number,
        position,
        registrationId,
        joinedAt: new Date().toISOString(),
      };

      await set(newPlayerRef, player);

      return {
        id: newPlayerRef.key!,
        ...player,
      };
    } catch (error) {
      console.error('❌ Error adding player to roster:', error);
      throw error;
    }
  },

  // Update player
  async updatePlayer(
    teamId: string,
    playerId: string,
    updates: Partial<Omit<Player, 'id' | 'joinedAt'>>
  ): Promise<void> {
    try {
      const playerRef = ref(db, `rosters/${teamId}/${playerId}`);
      const snapshot = await get(playerRef);

      if (snapshot.exists()) {
        await set(playerRef, {
          ...snapshot.val(),
          ...updates,
        });
      }
    } catch (error) {
      console.error('❌ Error updating player:', error);
      throw error;
    }
  },

  // Remove player from roster
  async removePlayer(teamId: string, playerId: string): Promise<void> {
    try {
      const playerRef = ref(db, `rosters/${teamId}/${playerId}`);
      await remove(playerRef);
    } catch (error) {
      console.error('❌ Error removing player from roster:', error);
      throw error;
    }
  },

  // Get player by jersey number
  async getPlayerByNumber(
    teamId: string,
    number: number
  ): Promise<Player | null> {
    try {
      const rosterRef = ref(db, `rosters/${teamId}`);
      const snapshot = await get(rosterRef);

      if (!snapshot.exists()) return null;

      let foundPlayer: Player | null = null;
      snapshot.forEach((child) => {
        const player = { id: child.key!, ...child.val() } as Player;
        if (player.number === number) {
          foundPlayer = player;
        }
      });

      return foundPlayer;
    } catch (error) {
      console.error('❌ Error fetching player by number:', error);
      throw error;
    }
  },

  // Get players by position
  async getPlayersByPosition(
    teamId: string,
    position: string
  ): Promise<Player[]> {
    try {
      const rosterRef = ref(db, `rosters/${teamId}`);
      const snapshot = await get(rosterRef);

      if (!snapshot.exists()) return [];

      const players: Player[] = [];
      snapshot.forEach((child) => {
        const player = { id: child.key!, ...child.val() } as Player;
        if (player.position === position) {
          players.push(player);
        }
      });

      return players.sort((a, b) => a.number - b.number);
    } catch (error) {
      console.error('❌ Error fetching players by position:', error);
      throw error;
    }
  },

  // Link registration to roster player
  async linkRegistrationToPlayer(
    teamId: string,
    playerId: string,
    registrationId: string
  ): Promise<void> {
    try {
      const playerRef = ref(db, `rosters/${teamId}/${playerId}`);
      const snapshot = await get(playerRef);

      if (snapshot.exists()) {
        await set(playerRef, {
          ...snapshot.val(),
          registrationId,
        });
      }
    } catch (error) {
      console.error('❌ Error linking registration to player:', error);
      throw error;
    }
  },
};
