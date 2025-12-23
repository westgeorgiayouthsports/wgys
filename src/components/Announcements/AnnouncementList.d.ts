import type { Announcement } from '../../store/slices/announcementsSlice';
interface Props {
    announcements: Announcement[];
    loading: boolean;
    onEdit: (id: string) => void;
    onPublish: (id: string) => void;
    onDelete: (id: string) => void;
    userId?: string;
    userRole?: string;
}
export default function AnnouncementList({ announcements, loading, onEdit, onPublish, onDelete, userId: _userId, userRole, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
