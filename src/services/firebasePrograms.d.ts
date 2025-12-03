import type { Program, ProgramFormData } from '../types/program';
export declare const programsService: {
    getPrograms(): Promise<Program[]>;
    createProgram(programData: ProgramFormData, createdBy: string): Promise<string>;
    updateProgram(programId: string, programData: Partial<ProgramFormData>): Promise<void>;
    deleteProgram(programId: string): Promise<void>;
};
