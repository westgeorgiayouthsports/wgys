import { useEffect, useState } from 'react';
import { announcementsService } from '../../services/firebaseAnnouncements';
import type { Announcement } from '../../store/slices/announcementsSlice';
import { 
  Card, 
  Typography, 
  Spin, 
  Alert, 
  Button, 
  Empty, 
  Tag, 
  Space,
  Divider
} from 'antd';
import { 
  SoundOutlined, 
  ReloadOutlined, 
  CalendarOutlined, 
  UserOutlined 
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadPublishedAnnouncements();
  }, []);

  const loadPublishedAnnouncements = async () => {
    try {
      setLoading(true);
      const allAnnouncements = await announcementsService.getAllPublishedAnnouncements();
      setAnnouncements(allAnnouncements);
      setError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load announcements';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <Title level={2}>
              <SoundOutlined /> Team Announcements
            </Title>
            <Text type="secondary">Stay updated with the latest team news and information</Text>
          </div>
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text>Loading announcements...</Text>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <Title level={2}>
              <SoundOutlined /> Team Announcements
            </Title>
            <Text type="secondary">Stay updated with the latest team news and information</Text>
          </div>
          <Alert
            title="Unable to load announcements"
            description={error}
            type="error"
            showIcon
            action={
              <Button 
                size="small" 
                icon={<ReloadOutlined />}
                onClick={loadPublishedAnnouncements}
              >
                Try again
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <Title level={2}>
            <SoundOutlined /> Team Announcements
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            Stay updated with the latest team news and information
          </Text>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <Empty
              image={<SoundOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
              description={
                <div>
                  <Title level={4} type="secondary">No announcements yet</Title>
                  <Text type="secondary">Check back later for team updates and news.</Text>
                </div>
              }
            />
          </Card>
        ) : (
          <div>
            {/* Stats */}
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
              </Tag>
            </div>
            
            {/* Announcements List */}
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              {announcements.map((announcement) => (
                <Card 
                  key={announcement.id}
                  hoverable
                  style={{ borderRadius: '12px' }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
                      {announcement.title}
                    </Title>
                    <Space split={<Divider type="vertical" />}>
                      <Space>
                        <UserOutlined />
                        <Text type="secondary">{announcement.authorEmail}</Text>
                      </Space>
                      <Space>
                        <CalendarOutlined />
                        <Text type="secondary">
                          {formatDate(announcement.publishedAt || announcement.createdAt)}
                        </Text>
                      </Space>
                    </Space>
                  </div>
                  
                  <div style={{ lineHeight: '1.6' }}>
                    <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
                  </div>
                </Card>
              ))}
            </Space>
          </div>
        )}
      </div>
    </div>
  );
}