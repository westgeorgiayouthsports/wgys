import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Input, Button, Space, Typography, Avatar, Spin, Empty } from 'antd';
import { SendOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { RootState } from '../../store/store';
import { setMessages, addMessage, deleteMessage as deleteMessageAction } from '../../store/slices/chatSlice';
import { makeSelectMessages } from '../../store/selectors/chatSelectors';
import { chatService } from '../../services/firebaseChat';

const { Text } = Typography;

interface ChatBoxProps {
  teamId?: string;
  canPost?: boolean;
}

export default function ChatBox({ teamId }: ChatBoxProps) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Create memoized selector for this component's teamId
  const selectMessagesForTeam = useMemo(() => makeSelectMessages(teamId), [teamId]);
  const messages = useSelector(selectMessagesForTeam);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [_canPost] = useState<boolean | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages on mount
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    let unsubscribe: (() => void) | null = null;
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout | null = null;

    try {
      unsubscribe = chatService.subscribeToMessages((updatedMessages) => {
        if (mounted) {
          dispatch(setMessages({ teamId, messages: updatedMessages }));
          setLoading(false);
          if (loadingTimeout) clearTimeout(loadingTimeout);
        }
      }, teamId);
      
      // If messages don't load within 5 seconds, stop showing loading spinner
      loadingTimeout = setTimeout(() => {
        if (mounted) {
          setLoading(false);
        }
      }, 5000);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [user?.uid, dispatch]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !messageText.trim()) return;

    try {
      const newMessage = await chatService.sendMessage(user.uid, user.email || 'Unknown', messageText, teamId);
      dispatch(addMessage({ teamId, message: newMessage }));
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId, teamId);
      dispatch(deleteMessageAction({ teamId, id: messageId }));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return (
    <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '8px 0',
        marginBottom: '16px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
            <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>Loading messages...</Text>
          </div>
        )}
        {messages.length === 0 && !loading && (
          <Empty 
            description="No messages yet. Start the conversation!"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
        {messages.map(message => (
          <div key={message.id} style={{ 
            marginBottom: '12px',
            display: 'flex',
            justifyContent: message.userId === user?.uid ? 'flex-end' : 'flex-start'
          }}>
            <div style={{ 
              maxWidth: '80%',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: message.userId === user?.uid ? '#1890ff' : '#f5f5f5',
              color: message.userId === user?.uid ? '#fff' : '#000'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '4px'
              }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text 
                  style={{ 
                    fontSize: '12px',
                    color: message.userId === user?.uid ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)'
                  }}
                >
                  {message.userEmail.split('@')[0]}
                </Text>
                <Text 
                  style={{ 
                    fontSize: '11px',
                    color: message.userId === user?.uid ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Text>
                {message.userId === user?.uid && (
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteMessage(message.id)}
                    style={{ 
                      color: 'rgba(255,255,255,0.8)',
                      minWidth: 'auto',
                      padding: '0 4px'
                    }}
                  />
                )}
              </div>
              <div>{message.text}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={messageText}
          onChange={e => { setMessageText(e.target.value); }}
          placeholder="Type a message..."
          onPressEnter={handleSendMessage}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          disabled={!messageText.trim()}
        >
          Send
        </Button>
      </Space.Compact>
    </div>
  );
}
