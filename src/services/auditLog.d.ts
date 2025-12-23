export type AuditEntity = 'program' | 'team' | 'season' | 'person' | 'family' | 'teamAssignment' | 'other';
export interface AuditRecord {
    id?: string;
    action: string;
    entityType: AuditEntity;
    entityId?: string | null;
    actorId?: string | null;
    actorEmail?: string | null;
    details?: any;
    timestamp: string;
}
export declare const auditLogService: {
    log(record: Omit<AuditRecord, "id" | "timestamp">): Promise<string>;
    getLogs(limit?: number): Promise<any[]>;
    deleteLog(id: string): Promise<boolean>;
    logBulk(action: string, entityType: AuditEntity, entityIds: string[], details?: any): Promise<any>;
    logDelete(entityType: AuditEntity, entityId: string | null, beforeData?: any, actorId?: string | null): Promise<any>;
};
export default auditLogService;
