import { useState, useEffect } from 'react';
import { Card, Input, Button, Avatar, Typography, Space, App, Divider } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { commentsService, type Comment } from '../../services/firebaseComments';

const { TextArea } = Input;
const { Text } = Typography;

interface Props {
  announcementId: string;
  allowComments: boolean;
  onCommentCountChange?: (count: number) => void;
}

export default function AnnouncementComments({ announcementId, allowComments, onCommentCountChange }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);

  const { message } = App.useApp();

  useEffect(() => {
    loadComments();
  }, [announcementId]);

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const loadedComments = await commentsService.getComments(announcementId);
      const sortedComments = loadedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(sortedComments);
      
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        onCommentCountChange?.(loadedComments.length);
      }, 0);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const commentData = {
        text: newComment.trim(),
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        userEmail: user.email || '',
        createdAt: new Date().toISOString(),
      };
      
      const savedComment = await commentsService.addComment(announcementId, commentData);
      
      setComments(prev => {
        const newComments = [savedComment, ...prev];
        onCommentCountChange?.(newComments.length);
        return newComments;
      });
      setNewComment('');
      message.success('Comment posted!');
    } catch (error) {
      console.error('Failed to post comment:', error);
      message.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  if (!allowComments) {
    return null;
  }

  return (
    <Card title="Comments" style={{ marginTop: '16px' }}>
      {/* Comment Input */}
      <div style={{ marginBottom: '16px' }}>
        <TextArea
          rows={3}
          value={newComment}
          onChange={(e) => { setNewComment(e.target.value); }}
          placeholder="Write a comment..."
          maxLength={500}
          showCount
        />
        <div style={{ marginTop: '8px', textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!newComment.trim()}
          >
            Post Comment
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div>
        {loadingComments ? (
          <Text type="secondary">Loading comments...</Text>
        ) : comments.length === 0 ? (
          <Text type="secondary">No comments yet. Be the first to comment!</Text>
        ) : (
          comments.map((comment, index) => (
            <div key={comment.id}>
              <div style={{ display: 'flex', gap: '12px', padding: '12px 0' }}>
                <Avatar icon={<UserOutlined />} />
                <div style={{ flex: 1 }}>
                  <Space>
                    <Text strong>{comment.userName}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </Text>
                  </Space>
                  <div style={{ marginTop: '4px' }}>
                    <Text>{comment.text}</Text>
                  </div>
                </div>
              </div>
              {index < comments.length - 1 && <Divider style={{ margin: '8px 0' }} />}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}