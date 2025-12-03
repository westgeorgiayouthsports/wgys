export type QuestionType = 'short_answer' | 'paragraph' | 'dropdown' | 'checkboxes' | 'file_upload' | 'waiver';
export interface ProgramQuestion {
    id: string;
    type: QuestionType;
    title: string;
    description?: string;
    required: boolean;
    options?: string[];
    waiverText?: string;
    order: number;
}
export interface ProgramFormResponse {
    questionId: string;
    answer: string | string[] | boolean;
    fileUrl?: string;
}
export interface ProgramRegistration {
    id: string;
    programId: string;
    athleteId: string;
    familyId: string;
    registeredBy: string;
    responses: ProgramFormResponse[];
    status: 'cart' | 'pending' | 'confirmed' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'refunded';
    totalAmount: number;
    registrationDate: string;
    createdAt: string;
    updatedAt: string;
}
