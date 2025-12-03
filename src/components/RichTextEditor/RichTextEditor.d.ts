import './RichTextEditor.css';
interface Props {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
}
export default function RichTextEditor({ value, onChange, placeholder }: Props): import("react/jsx-runtime").JSX.Element;
export {};
