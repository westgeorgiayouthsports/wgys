import { useState, useEffect } from 'react';
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
import StaticField from './StaticField';
import type { RootState } from '../../store/store';
import { setTheme } from '../../store/slices/themeSlice';
import { setShowMyMenuItems, setDebugLogging } from '../../store/slices/uiSlice';
import logger from '../../utils/logger';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { ref as dbRef, update as dbUpdate } from 'firebase/database';
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
  const showMy = useSelector((state: RootState) => state.ui.showMyMenuItems);
  const showDebug = useSelector((state: RootState) => state.ui.debugLogging);
  const [isEditing, setIsEditing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [displayName, setDisplayName] = useState(person.displayName || `${person.firstName} ${person.lastName}`);
  const [photoURL, setPhotoURL] = useState(person.photoURL || '');
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [localTheme, setLocalTheme] = useState<boolean>(isDarkMode);
  const [localShowMy, setLocalShowMy] = useState<boolean>(showMy);
  const [localDebug, setLocalDebug] = useState<boolean>(showDebug);

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

      // Persist UI preferences for current user
      if (person.userId === user?.uid && user?.uid) {
        try {
          const prefRef = dbRef(db, `users/${user.uid}/preferences`);
          await dbUpdate(prefRef, {
            theme: localTheme ? 'dark' : 'light',
            showMyMenuItems: localShowMy,
            debugLogging: localDebug,
          });
          dispatch(setTheme(localTheme));
          dispatch(setShowMyMenuItems(localShowMy));
          dispatch(setDebugLogging(localDebug));
          try {
            localStorage.setItem(`wgys.pref.theme`, localTheme ? 'dark' : 'light');
            localStorage.setItem(`wgys.pref.showMyMenuItems`, String(localShowMy));
            localStorage.setItem('wgys.debugLogging', localDebug ? '1' : '0');
          } catch (e) {
            logger.error('Failed to cache preferences locally', e);
          }
        } catch (e) {
          logger.error('Failed to persist preferences to RTDB', e);
        }
      }

      message.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      logger.error('Error updating profile:', error);
      message.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(person.displayName || `${person.firstName} ${person.lastName}`);
    setPhotoURL(person.photoURL || '');
    setLocalTheme(isDarkMode);
    setLocalShowMy(showMy);
    setLocalDebug(showDebug);
    setIsEditing(false);
  };


  // Keep local theme in sync with global theme when it changes elsewhere
  useEffect(() => {
    setLocalTheme(isDarkMode);
  }, [isDarkMode]);

  return (
    <>
      
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
            size={96}
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
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
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
                size="middle"
                maxLength={50}
              />
              {isEditing && (
                <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {displayName.length}/50 characters
                </Text>
              )}
            </div>

            {/* System assigned fields (read-only) */}
            <div style={{ padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 8 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>System Assigned</Text>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                These values are managed by the system and are read-only.
              </Text>
              <StaticField
                label="Email Address"
                value={person.email || ''}
                help="Managed by authentication system"
              />

              {person.userId && (
                <StaticField
                  label="User ID"
                  value={person.userId}
                  monospace
                  help="System-assigned unique identifier (read-only)"
                />
              )}
            </div>

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
                    {localTheme ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                  <Switch
                    checked={localTheme}
                    onChange={(v) => setLocalTheme(v)}
                    disabled={!isEditing || !canEdit}
                    checkedChildren="🌙"
                    unCheckedChildren="☀️"
                  />
                </div>
                <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Choose your preferred theme appearance
                </Text>
              </div>
            )}
            {/* Sidebar "My" items preference */}
            {person.userId === user?.uid && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  Sidebar Preferences
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
                    Show "My" items in left sidebar
                  </Text>
                  <Switch
                    checked={localShowMy}
                    onChange={(v) => setLocalShowMy(v)}
                    disabled={!isEditing || !canEdit}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                  />
                </div>
                <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  When off, menu items starting with "My" will be available from your user menu only.
                </Text>
              </div>
            )}
            {/* Diagnostics (hidden by default) */}
            {person.userId === user?.uid && (
              <div>
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <Button type="link" onClick={() => setShowDiagnostics(s => !s)} style={{ padding: 0 }}>
                    {showDiagnostics ? 'Hide diagnostics' : 'Show diagnostics'}
                  </Button>
                </div>
                {showDiagnostics && (
                  <div style={{ padding: '12px 16px', border: '1px solid #f0f0f0', borderRadius: 8, marginBottom: 12 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Diagnostics</Text>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>Enable debug logging</Text>
                      <Switch
                        checked={localDebug}
                        onChange={(v) => setLocalDebug(v)}
                        disabled={!isEditing || !canEdit}
                      />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Useful for support; logs will be visible in browser console.</Text>
                  </div>
                )}
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
            size="middle"
            type="url"
          />
          {photoURL && (
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Preview:</Text>
              <Avatar size={64} src={photoURL} icon={<UserOutlined />} onError={() => true} />
            </div>
          )}
        </div>
      </Modal>
      </Card>
    </>
  );
}