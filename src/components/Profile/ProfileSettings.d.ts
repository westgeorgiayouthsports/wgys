import type { Person } from '../../types/person';
interface ProfileSettingsProps {
    person: Person;
    onPersonUpdate: (updatedPerson: Person) => void;
    showThemeToggle?: boolean;
}
export default function ProfileSettings({ person, onPersonUpdate, showThemeToggle }: ProfileSettingsProps): import("react/jsx-runtime").JSX.Element;
export {};
