import { useState } from 'react';
import { Card, Row, Col, Tag, Button, Space, Typography, Pagination, Spin, Empty, Avatar } from 'antd';
import { EditOutlined, DeleteOutlined, SendOutlined, EyeOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Announcement } from '../../store/slices/announcementsSlice';

const { Title, Text, Paragraph } = Typography;

interface Props {
  announcements: Announcement[];
  loading: boolean;
  onEdit: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  userId?: string;
  userRole?: string;
}

export default function AnnouncementList({
  announcements,
  loading,
  onEdit,
  onPublish,
  onDelete,
  userId,
  userRole,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  
  // Show all announcements for now (remove userId filter)
  const userAnnouncements = announcements;
  const publishedAnnouncements = announcements.filter(a => a.status === 'published');
  
  const paginatedAnnouncements = userAnnouncements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Your Announcements Section */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={3}>Announcements ({announcements.length})</Title>
        {userAnnouncements.length === 0 ? (
          <Empty description="No announcements yet. Create your first one to get started!" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {paginatedAnnouncements.map(announcement => (
                <Col xs={24} sm={12} lg={8} xl={6} key={announcement.id}>
                  <Card
                    hoverable
                    actions={[
                      ...(userRole === 'admin' || userRole === 'owner' ? [
                        <Button type="text" icon={<EditOutlined />} onClick={() => { onEdit(announcement.id); }}>Edit</Button>,
                        announcement.status === 'draft' ? (
                          <Button type="text" icon={<SendOutlined />} onClick={() => { onPublish(announcement.id); }}>Publish</Button>
                        ) : (
                          <Button type="text" icon={<EyeOutlined />}>{announcement.views || 0}</Button>
                        ),
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { onDelete(announcement.id); }}>Delete</Button>
                      ] : [
                        <Button type="text" icon={<EyeOutlined />}>{announcement.views || 0}</Button>
                      ])
                    ]}
                  >
                    <Card.Meta
                      avatar={<Avatar style={{ backgroundColor: announcement.status === 'published' ? '#52c41a' : '#faad14' }}>
                        {announcement.status === 'draft' ? '📋' : '🔴'}
                      </Avatar>}
                      title={<Text strong>{announcement.title}</Text>}
                      description={
                        <div>
                          <Paragraph ellipsis={{ rows: 2 }}>
                            <div dangerouslySetInnerHTML={{ __html: announcement.content.substring(0, 100) + '...' }} />
                          </Paragraph>
                          <Space size="small">
                            <Tag color={announcement.status === 'published' ? 'green' : 'orange'}>
                              {announcement.status}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <CalendarOutlined /> {new Date(announcement.createdAt).toLocaleDateString()}
                            </Text>
                          </Space>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
            
            {userAnnouncements.length > pageSize && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Pagination
                  current={currentPage}
                  total={userAnnouncements.length}
                  pageSize={pageSize}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                  showQuickJumper
                  showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} announcements`}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Published Announcements Section */}
      {publishedAnnouncements.length > 0 && (
        <div>
          <Title level={3}>🔴 Published News Feed</Title>
          <Row gutter={[16, 16]}>
            {publishedAnnouncements.slice(0, 6).map(announcement => (
              <Col xs={24} sm={12} lg={8} key={announcement.id}>
                <Card hoverable>
                  <Card.Meta
                    avatar={<Avatar style={{ backgroundColor: '#52c41a' }}>🔴</Avatar>}
                    title={<Text strong>{announcement.title}</Text>}
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          By {announcement.userEmail.split('@')[0]} • {new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString()}
                        </Text>
                        <Paragraph ellipsis={{ rows: 3 }} style={{ marginTop: '8px' }}>
                          <div dangerouslySetInnerHTML={{ __html: announcement.content.substring(0, 150) + '...' }} />
                        </Paragraph>
                        <Space>
                          <Text type="secondary"><EyeOutlined /> {announcement.views || 0}</Text>
                        </Space>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}