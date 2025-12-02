export type QuestionType = 'short_answer' | 'paragraph' | 'dropdown' | 'checkboxes' | 'file_upload' | 'waiver';

export interface ProgramQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[]; // For dropdown and checkboxes
  waiverText?: string; // For waiver type
  order: number;
}

export interface ProgramFormResponse {
  questionId: string;
  answer: string | string[] | boolean; // string for text, string[] for checkboxes, boolean for waiver
  fileUrl?: string; // For file uploads
}

export interface ProgramRegistration {
  id: string;
  programId: string;
  athleteId: string; // FamilyMember ID
  familyId: string;
  registeredBy: string; // User ID
  responses: ProgramFormResponse[];
  status: 'cart' | 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  totalAmount: number;
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
}