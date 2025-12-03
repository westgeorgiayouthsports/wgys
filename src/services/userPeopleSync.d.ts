export declare const userPeopleSync: {
    /**
     * Sync users collection with people collection
     * Creates people records for users who don't have them
     */
    syncUsersWithPeople(): Promise<{
        created: number;
        linked: number;
        errors: string[];
    }>;
    /**
     * Get users who don't have corresponding people records
     */
    getUnlinkedUsers(): Promise<{
        uid: string;
        email: string;
        displayName: string;
    }[]>;
};
