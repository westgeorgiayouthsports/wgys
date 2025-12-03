import type { Announcement } from '../../store/slices/announcementsSlice';
interface Props {
    announcement?: Announcement;
    onSave: (title: string, content: string, showOnFeed: boolean, allowComments: boolean) => Promise<void>;
    onCancel: () => void;
}
export default function AnnouncementEditor({ announcement, onSave, onCancel }: Props): import("react/jsx-runtime").JSX.Element;
export {};
