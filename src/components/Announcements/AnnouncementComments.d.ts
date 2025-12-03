interface Props {
    announcementId: string;
    allowComments: boolean;
    onCommentCountChange?: (count: number) => void;
}
export default function AnnouncementComments({ announcementId, allowComments, onCommentCountChange }: Props): import("react/jsx-runtime").JSX.Element;
export {};
