import type { Program, ProgramFormData } from '../types/program';
export declare const programsService: {
    getPrograms(): Promise<Program[]>;
    getProgramsBySeason(seasonId: string): Promise<Program[]>;
    createProgram(programData: ProgramFormData, createdBy: string): Promise<string>;
    updateProgram(programId: string, programData: Partial<ProgramFormData>): Promise<void>;
    deleteProgram(programId: string): Promise<void>;
    bulkUpdatePrograms(programIds: string[], updates: Partial<ProgramFormData & {
        seasonId?: string;
    }>): Promise<void>;
};
