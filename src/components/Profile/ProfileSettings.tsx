import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card,
  Typography,
  Input,
  Button,
  Space,
  Row,
  Col,
  Avatar,
  message,
  Switch,
  Modal,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import type { RootState } from '../../store/store';
import { toggleTheme } from '../../store/slices/themeSlice';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { setUser } from '../../store/slices/authSlice';
import { peopleService } from '../../services/firebasePeople';
import type { Person } from '../../types/person';

const { Title, Text } = Typography;

interface ProfileSettingsProps {
  person: Person;
  onPersonUpdate: (updatedPerson: Person) => void;
  showThemeToggle?: boolean;
}

export default function ProfileSettings({ person, onPersonUpdate, showThemeToggle = true }: ProfileSettingsProps) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { role } = useSelector((state: RootState) => state.auth);
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(person.displayName || `${person.firstName} ${person.lastName}`);
  const [photoURL, setPhotoURL] = useState(person.photoURL || '');
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Only allow editing if it's the current user's profile or admin/owner
  const canEdit = person.userId === user?.uid || role === 'admin' || role === 'owner';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate photo URL length
      if (photoURL && photoURL.length > 2000) {
        message.error('Photo URL is too long. Please use a shorter URL.');
        setIsSaving(false);
        return;
      }

      const profileData = {
        displayName,
        photoURL: photoURL || undefined,
      };

      // Update Person record
      await peopleService.updatePersonProfile(person.id, profileData);
      
      // Update Firebase Auth if this is the current user
      if (person.userId === user?.uid && auth.currentUser && user) {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL: photoURL || null,
        });
        
        // Update Redux store
        dispatch(setUser({
          user: { ...user, displayName, photoURL },
          role,
          createdAt: user.createdAt,
        }));
      }

      // Update parent component
      onPersonUpdate({
        ...person,
        displayName,
        photoURL,
        updatedAt: new Date().toISOString(),
      });

      message.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(person.displayName || `${person.firstName} ${person.lastName}`);
    setPhotoURL(person.photoURL || '');
    setIsEditing(false);
  };

  return (
    <Card
      title="Profile Settings"
      extra={
        canEdit && !isEditing ? (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => { setIsEditing(true); }}
          >
            Edit Profile
          </Button>
        ) : canEdit && isEditing ? (
          <Space>
            <Button
              icon={<CloseOutlined />}
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={isSaving}
            >
              Save Changes
            </Button>
          </Space>
        ) : null
      }
    >
      <Row gutter={[24, 24]}>
        <Col span={24} md={6} style={{ textAlign: 'center' }}>
          <Avatar
            size={120}
            src={photoURL || person.photoURL}
            icon={<UserOutlined />}
            style={{
              backgroundColor: '#00d4ff',
              marginBottom: '16px',
              cursor: isEditing && canEdit ? 'pointer' : 'default',
            }}
            onClick={() => isEditing && canEdit && setPhotoModalVisible(true)}
            onError={() => true}
          />
          {isEditing && canEdit && (
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              Click to change profile image
            </Text>
          )}
          <div>
            <Title level={4} style={{ margin: '0 0 4px 0' }}>
              {displayName || `${person.firstName} ${person.lastName}`}
            </Title>
            <Text type="secondary">
              {person.hasAccount ? 'Account Holder' : 'Family Member'}
            </Text>
          </div>
        </Col>

        <Col span={24} md={18}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {/* Display Name */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Display Name
              </Text>
              <Input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); }}
                disabled={!isEditing || !canEdit}
                placeholder="Enter display name"
                size="large"
                maxLength={50}
              />
              {isEditing && (
                <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {displayName.length}/50 characters
                </Text>
              )}
            </div>

            {/* Email */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Email Address
              </Text>
              <Input
                value={person.email || ''}
                disabled
                size="large"
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Email is managed in basic information
              </Text>
            </div>

            {/* User ID - Only for account holders */}
            {person.userId && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  User ID
                </Text>
                <Input
                  value={person.userId}
                  disabled
                  size="large"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                />
                <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  This is your unique identifier in the system
                </Text>
              </div>
            )}

            {/* Theme Preference - Only for current user */}
            {showThemeToggle && person.userId === user?.uid && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  <BulbOutlined /> Theme Preference
                </Text>
                <div style={{
                  padding: '12px 16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Text>
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                  <Switch
                    checked={isDarkMode}
                    onChange={() => dispatch(toggleTheme())}
                    checkedChildren="🌙"
                    unCheckedChildren="☀️"
                  />
                </div>
                <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Choose your preferred theme appearance
                </Text>
              </div>
            )}
          </Space>
        </Col>
      </Row>

      {/* Profile Image Modal */}
      <Modal
        title="Change Profile Image"
        open={photoModalVisible}
        onCancel={() => { setPhotoModalVisible(false); }}
        onOk={() => { setPhotoModalVisible(false); }}
        okText="Save"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Text>Enter a valid image URL for your profile picture:</Text>
          <Input
            value={photoURL}
            onChange={(e) => { setPhotoURL(e.target.value); }}
            placeholder="https://example.com/image.jpg"
            size="large"
            type="url"
          />
          {photoURL && (
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Preview:</Text>
              <Avatar size={80} src={photoURL} icon={<UserOutlined />} onError={() => true} />
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
}