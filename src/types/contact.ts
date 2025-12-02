export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  groups: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string; // uid of user who created this contact
  source: 'signup' | 'manual'; // how the contact was created
}

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  groups?: string[];
}