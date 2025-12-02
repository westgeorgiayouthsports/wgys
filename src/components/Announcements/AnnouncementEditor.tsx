import { useState, useEffect } from 'react';
import { Announcement } from '../../store/slices/announcementsSlice';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import { 
  Card, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Switch, 
  Row, 
  Col, 
  message 
} from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Props {
  announcement?: Announcement;
  onSave: (title: string, content: string, showOnFeed: boolean, allowComments: boolean) => Promise<void>;
  onCancel: () => void;
}

export default function AnnouncementEditor({ announcement, onSave, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showOnFeed, setShowOnFeed] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('📝 AnnouncementEditor received announcement:', announcement);
    if (announcement) {
      console.log('📝 Loading existing announcement:', { title: announcement.title, content: announcement.content });
      setTitle(announcement.title);
      setContent(announcement.content);
      setShowOnFeed(announcement.showOnFeed ?? true);
      setAllowComments(announcement.allowComments ?? true);
    } else {
      console.log('📝 Resetting form for new announcement');
      setTitle('');
      setContent('');
      setShowOnFeed(true);
      setAllowComments(true);
    }
  }, [announcement]);

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    console.log('💾 Save Draft button clicked');
    console.log('State:', { title, content, isEditing: !!announcement });

    // Validation
    if (!title || title.trim().length === 0) {
      message.error('Title is required');
      return;
    }

    if (!content || content.trim().length === 0) {
      message.error('Content is required');
      return;
    }

    setIsSaving(true);
    console.log('🔄 Saving...');

    try {
      await onSave(title.trim(), content.trim(), showOnFeed, allowComments);
      message.success('Announcement saved successfully!');
    } catch (error) {
      console.error('❌ Save failed:', error);
      message.error('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
        <Card 
          title={announcement ? '✏️ Edit Announcement' : '📝 New Announcement'}
          extra={
            <Space>
              <Button 
                icon={<CloseOutlined />}
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={isSaving}
              >
                Save Draft
              </Button>
            </Space>
          }
        >
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {/* Title Input */}
            <div>
              <Text strong>Title *</Text>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., 2026 Spring Registration Open"
                maxLength={100}
                disabled={isSaving}
                showCount
                size="large"
              />
            </div>

            {/* Settings */}
            <Card size="small" title="Announcement Settings">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Space>
                    <Switch 
                      checked={showOnFeed} 
                      onChange={setShowOnFeed}
                      disabled={isSaving}
                    />
                    <Text>Show On Announcement Feed</Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space>
                    <Switch 
                      checked={allowComments} 
                      onChange={setAllowComments}
                      disabled={isSaving}
                    />
                    <Text>Allow Comments</Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Rich Text Editor */}
            <div>
              <Text strong>Content *</Text>
              <div style={{ marginTop: '8px' }}>
                <RichTextEditor
                  key={announcement?.id || 'new'}
                  value={content}
                  onChange={setContent}
                  placeholder="Write your announcement here..."
                />
              </div>
            </div>
          </Space>
        </Card>
    </div>
  );
}
