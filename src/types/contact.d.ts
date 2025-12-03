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
    createdBy: string;
    source: 'signup' | 'manual';
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
