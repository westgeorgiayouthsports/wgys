import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Spin, Card, App } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { RootState } from '../store/store';
import { peopleService } from '../services/firebasePeople';
import ProfileSettings from '../components/Profile/ProfileSettings';
import type { Person } from '../types/person';

export default function ProfileSettingsPage() {
  const { message } = App.useApp();
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const allPeople = await peopleService.getPeople();
      const userPerson = allPeople.find(p => p.userId === user?.uid);

      if (userPerson) {
        setCurrentUser(userPerson);
      } else {
        // Create person record for user if doesn't exist
        const newPersonData = {
          firstName: user?.displayName?.split(' ')[0] || 'User',
          lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
          email: user?.email || '',
          roles: ['parent'] as any[],
        };

        const newPersonId = await peopleService.createPerson(newPersonData, user?.uid || '');
        await peopleService.linkPersonToAccount(newPersonId, user?.uid || '');

        const newPerson: Person = {
          id: newPersonId,
          ...newPersonData,
          hasAccount: true,
          userId: user?.uid,
          roles: [],
          contactPreferences: [],
          programs: [],
          teams: [],
          groups: [],
          source: 'signup',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          isActive: true,
        };

        setCurrentUser(newPerson);
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      message.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Card style={{ textAlign: 'center' }}>
        <UserOutlined style={{ fontSize: 48, color: '#999', marginBottom: 16 }} />
        <p>Unable to load profile information</p>
      </Card>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <ProfileSettings
        person={currentUser}
        onPersonUpdate={(updatedPerson) => {
          setCurrentUser(updatedPerson);
        }}
        showThemeToggle={true}
      />
    </div>
  );
}
