import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import {
  setLoading,
  setAnnouncements,
  addAnnouncement,
  deleteAnnouncement as deleteAnnouncementAction,
  setError,
} from '../store/slices/announcementsSlice';
import { announcementsService } from '../services/firebaseAnnouncements';
import AnnouncementEditor from '../components/Announcements/AnnouncementEditor';
import AnnouncementComments from '../components/Announcements/AnnouncementComments';
import logger from '../utils/logger';
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Statistic
  , Switch } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  EyeOutlined
} from '@ant-design/icons';

const { Text } = Typography;

type View = 'list' | 'editor' | 'detail';

export default function Announcements() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);
  const announcements = useSelector((state: RootState) => state.announcements.announcements);
  const loading = useSelector((state: RootState) => state.announcements.loading);

  // Show AnnouncementList for all users with role-based permissions
  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [_error, setLocalError] = useState<string>('');

  // Load announcements on mount
  useEffect(() => {
    if (user?.uid) {
      loadAnnouncements();
    }
  }, [user?.uid]);

  const loadAnnouncements = async () => {
    if (!user?.uid) return;
    dispatch(setLoading(true));
    try {
      const userAnnouncements = await announcementsService.getAnnouncements(user.uid);
      dispatch(setAnnouncements(userAnnouncements));
      setLocalError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load announcements';
      setLocalError(errorMsg);
      dispatch(setError(errorMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setView('editor');
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('editor');
  };

  const handleView = async (id: string) => {
    // Increment view count
    try {
      const updatedAnnouncements = announcements.map(a =>
        a.id === id ? { ...a, views: (a.views || 0) + 1 } : a
      );
      dispatch(setAnnouncements(updatedAnnouncements));

      // Update in Firebase (you can add this service call later)
      // await announcementsService.incrementViews(id);
    } catch (error) {
      logger.error('Failed to update view count:', error);
    }

    setViewingId(id);
    setView('detail');
  };

  const handleEditFromDetail = () => {
    if (viewingId) {
      setEditingId(viewingId);
      setView('editor');
    }
  };

  const handleSave = async (title: string, content: string, showOnFeed: boolean, allowComments: boolean) => {
    if (!user?.uid) {
      logger.error('No user ID available');
      return;
    }

    try {
      setLocalError('');
      logger.info('🔄 Starting save operation...', { editingId, title, content });

      if (editingId) {
        // Update existing
        logger.info('📝 Updating existing announcement:', editingId);
        await announcementsService.updateAnnouncement(editingId, {
          title,
          content,
          showOnFeed,
          allowComments,
        });
        const updatedAnnouncements = announcements.map(a =>
          a.id === editingId ? { ...a, title, content } : a
        );
        dispatch(setAnnouncements(updatedAnnouncements));
        logger.info('✅ Updated announcement successfully');
      } else {
        // Create new (as draft)
        logger.info('📝 Creating new announcement...');
        const newAnnouncement = await announcementsService.createAnnouncement(
          user.uid,
          user.email || 'Unknown',
          title,
          content,
          showOnFeed,
          allowComments
        );
        logger.info('✅ Created new announcement:', newAnnouncement);
        dispatch(addAnnouncement(newAnnouncement));
        logger.info('✅ Added to Redux store');
      }

      setView('list');
      setEditingId(null);
      logger.info('✅ Save operation completed successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Operation failed';
      setLocalError(errorMsg);
      logger.error('❌ Save error:', err);
      throw err;
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await announcementsService.publishAnnouncement(id);
      const updatedAnnouncements = announcements.map(a =>
        a.id === id
          ? {
            ...a,
            status: 'published' as const,
            publishedAt: new Date().toISOString(),
          }
          : a
      );
      dispatch(setAnnouncements(updatedAnnouncements));
      setLocalError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Publish failed';
      setLocalError(errorMsg);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        await announcementsService.deleteAnnouncement(id);
        dispatch(deleteAnnouncementAction(id));
        setLocalError('');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Delete failed';
        setLocalError(errorMsg);
      }
    }
  };

  const draftCount = announcements.filter(a => a.status === 'draft').length;
  const publishedCount = announcements.filter(a => a.status === 'published').length;

  const handleCommentCountChange = useCallback((count: number) => {
    if (viewingId) {
      const updatedAnnouncements = announcements.map(a =>
        a.id === viewingId ? { ...a, commentCount: count } : a
      );
      dispatch(setAnnouncements(updatedAnnouncements));
    }
  }, [viewingId, announcements, dispatch]);

  const handleToggleField = async (id: string, field: 'showOnFeed' | 'allowComments', value: boolean) => {
    try {
      await announcementsService.updateAnnouncement(id, { [field]: value });
      const updatedAnnouncements = announcements.map(a =>
        a.id === id ? { ...a, [field]: value } : a
      );
      dispatch(setAnnouncements(updatedAnnouncements));
    } catch (error) {
      logger.error(`Failed to update ${field}:`, error);
    }
  };

  return (
    <div className="page-container">
      {view === 'list' && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <Typography.Title level={2} style={{ margin: 0 }}>Announcements</Typography.Title>
            <Typography.Text type="secondary">Manage team communications and announcements</Typography.Text>
          </div>

          {/* Create Button - Admin/Owner Only */}
          {(role === 'admin' || role === 'owner') && (
            <Card
              title="Create New Announcement"
              style={{ marginBottom: '24px' }}
            >
              <Button type="primary" icon={<EditOutlined />} onClick={handleCreateNew}>
                Create Announcement
              </Button>
            </Card>
          )}

          {/* Statistics Cards */}
          {announcements.length > 0 && (
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={6}>
                <Card>
                  <Statistic title="Total Announcements" value={announcements.length} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Published" value={publishedCount} styles={{ content: { color: '#52c41a' } }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Drafts" value={draftCount} styles={{ content: { color: '#faad14' } }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Total Reach" value={0} suffix="recipients" />
                </Card>
              </Col>
            </Row>
          )}

          {/* Announcements Table */}
          <Card title={`Team Announcements (${announcements.length})`}>
            <Table
              columns={[
                {
                  title: 'Title',
                  dataIndex: 'title',
                  key: 'title',
                  render: (title: string, record: any) => (
                    <Button type="link" onClick={() => handleView(record.id)} style={{ padding: 0, height: 'auto' }}>
                      <Text strong>{title}</Text>
                    </Button>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'published' ? 'green' : 'orange'}>
                      {status.toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: 'Date Created',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (date: string) => new Date(date).toLocaleDateString(),
                  sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                },
                {
                  title: 'Views',
                  key: 'views',
                  render: (record: any) => <Text><EyeOutlined /> {record.views || 0}</Text>,
                },
                {
                  title: 'Comments',
                  key: 'comments',
                  render: (record: any) => <Text>💬 {record.commentCount || 0}</Text>,
                },
                {
                  title: 'Show on Feed',
                  key: 'showOnFeed',
                  render: (record: any) => (
                    <Switch
                      checked={record.showOnFeed ?? true}
                      onChange={(checked) => handleToggleField(record.id, 'showOnFeed', checked)}
                      disabled={role !== 'admin' && role !== 'owner'}
                    />
                  ),
                },
                {
                  title: 'Allow Comments',
                  key: 'allowComments',
                  render: (record: any) => (
                    <Switch
                      checked={record.allowComments ?? true}
                      onChange={(checked) => handleToggleField(record.id, 'allowComments', checked)}
                      disabled={role !== 'admin' && role !== 'owner'}
                    />
                  ),
                },
                ...(role === 'admin' || role === 'owner' ? [{
                  title: 'Actions',
                  key: 'actions',
                  render: (record: any) => (
                    <Space>
                      <Button size="small" icon={<EditOutlined />} onClick={() => { handleEdit(record.id); }} />
                      {record.status === 'draft' && (
                        <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handlePublish(record.id)} />
                      )}
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                    </Space>
                  ),
                }] : [])
              ]}
              dataSource={announcements}
              rowKey="id"
              loading={loading}
              locale={{
                emptyText: 'No announcements yet. Check back later for updates!'
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} announcements`,
              }}
            />
          </Card>
        </>
      )}

      {/* View: Detail */}
      {view === 'detail' && viewingId && (
        <>
          <Card
            title={announcements.find(a => a.id === viewingId)?.title}
            extra={(
              (role === 'admin' || role === 'owner') && (
                <Button type="primary" icon={<EditOutlined />} onClick={handleEditFromDetail}>
                  Edit Announcement
                </Button>
              )
            )}
          >
            <Button type="link" onClick={() => { setView('list'); }} style={{ marginBottom: '16px' }}>
              ← Back to List
            </Button>
            <div style={{ marginTop: '16px' }}>
              <div dangerouslySetInnerHTML={{
                __html: announcements.find(a => a.id === viewingId)?.content || ''
              }} />
            </div>
          </Card>

          <AnnouncementComments
            announcementId={viewingId}
            allowComments={announcements.find(a => a.id === viewingId)?.allowComments ?? true}
            onCommentCountChange={handleCommentCountChange}
          />
        </>
      )}

      {/* View: Editor */}
      {view === 'editor' && (
        <AnnouncementEditor
          announcement={editingId ? announcements.find(a => a.id === editingId) : undefined}
          onSave={handleSave}
          onCancel={() => {
            setView('list');
            setEditingId(null);
            setViewingId(null);
          }}
        />
      )}
    </div>
  );
}