import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ref, get, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { toggleTheme } from '../store/slices/themeSlice';
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Spin,
  Popconfirm,
  Tabs,
  Avatar,
  App,
  Switch,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
  HomeOutlined,
  CrownOutlined,
  SafetyOutlined,
  SettingOutlined,
  CameraOutlined,
  BulbOutlined,
  LinkOutlined,
  MergeCellsOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import { peopleService } from '../services/firebasePeople';
import { userPeopleSync } from '../services/userPeopleSync';
import { familiesService } from '../services/firebaseFamilies';
import type { Person, PersonFormData, PersonRole, Family } from '../types/person';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  systemRole: 'user' | 'admin' | 'owner' | 'coach' | 'teamManager';
  createdAt?: string;
  updatedAt?: string;
}

export default function People() {
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const { role, user } = useSelector((state: RootState) => state.auth);
  const { isDarkMode } = useSelector((state: RootState) => state.theme);
  const [people, setPeople] = useState<Person[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [photoURL, setPhotoURL] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15 });
  const [syncing, setSyncing] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [deletePrimaryModalVisible, setDeletePrimaryModalVisible] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [newPrimaryId, setNewPrimaryId] = useState<string>('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPeople();
    loadUsers();
    loadFamilies();
    setDisplayName(user?.displayName || '');
    setPhotoURL(user?.photoURL || '');
    loadUserPreferences();
  }, [user]);

  const loadUserPreferences = async () => {
    if (user?.uid) {
      try {
        const userRef = ref(db, `users/${user.uid}/preferences`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const prefs = snapshot.val();
          if (prefs.peoplePageSize) {
            setPagination(prev => ({ ...prev, pageSize: prefs.peoplePageSize }));
          }
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }
  };

  const saveUserPreferences = async (pageSize: number) => {
    if (user?.uid) {
      try {
        const userRef = ref(db, `users/${user.uid}/preferences`);
        await update(userRef, { peoplePageSize: pageSize });
      } catch (error) {
        console.error('Failed to save user preferences:', error);
      }
    }
  };

  const loadFamilies = async () => {
    try {
      const familiesList = await familiesService.getFamilies();
      setFamilies(familiesList);
    } catch (error) {
      console.error('❌ Error loading families:', error);
    }
  };

  const loadPeople = async () => {
    setLoading(true);
    try {
      const peopleList = await peopleService.getPeople();
      setPeople(peopleList);
    } catch (error) {
      console.error('❌ Error loading people:', error);
      message.error({ content: 'Failed to load people' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        setUsers([]);
        return;
      }

      const dbUsers = snapshot.val();
      const usersList = Object.entries(dbUsers).map(([uid, userData]: [string, any]) => ({
        uid,
        displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
        email: userData.email || 'No email',
        systemRole: userData.role || 'user',
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }));

      setUsers(usersList);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      message.error({ content: 'Failed to load users' });
    }
  };

  const updateUserRole = async (uid: string, newRole: 'user' | 'admin' | 'owner' | 'coach' | 'teamManager') => {
    try {
      const userRef = ref(db, `users/${uid}`);
      await update(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      setUsers(users.map(user =>
        user.uid === uid ? { ...user, systemRole: newRole } : user
      ));
      setEditingUser(null);
      message.success({ content: `System role updated to ${newRole}` });
    } catch (error) {
      console.error('❌ Error updating role:', error);
      message.error({ content: 'Failed to update role' });
    }
  };

  const handleProfileSave = async () => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL: photoURL || undefined
        });

        const userRef = ref(db, `users/${user?.uid}`);
        await update(userRef, {
          displayName,
          photoURL: photoURL || null,
          updatedAt: new Date().toISOString()
        });

        message.success({ content: 'Profile updated successfully' });
        setProfileModalVisible(false);
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      message.error({ content: 'Failed to update profile' });
    }
  };

  const handleAddPerson = () => {
    setEditingPerson(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    form.setFieldsValue({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
      dateOfBirth: person.dateOfBirth ? dayjs(person.dateOfBirth) : null,
      sex: person.sex,
      roles: person.roles,
      address: person.address,
      city: person.city,
      state: person.state,
      zipCode: person.zipCode,
      schoolName: person.schoolName,
      graduationYear: person.graduationYear,
      groups: person.groups,
    });
    setModalVisible(true);
  };

  const handleDeletePerson = async (personId: string) => {
    try {
      await peopleService.deletePerson(personId);
      setPeople(people.filter(p => p.id !== personId));
      message.success({ content: 'Person deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting person:', error);
      message.error({ content: 'Failed to delete person' });
    }
  };

  const handleSyncUsers = async () => {
    setSyncing(true);
    try {
      const results = await userPeopleSync.syncUsersWithPeople();

      if (results.errors.length > 0) {
        message.warning({
          content: `Sync completed with ${results.errors.length} errors. Created: ${results.created}, Linked: ${results.linked}`,
          duration: 5
        });
        console.error('Sync errors:', results.errors);
      } else {
        message.success({
          content: `Sync completed successfully! Created: ${results.created} people, Linked: ${results.linked} accounts`,
          duration: 3
        });
      }

      // Refresh data
      await Promise.all([loadPeople(), loadUsers()]);
    } catch (error) {
      console.error('❌ Error syncing users:', error);
      message.error({ content: 'Failed to sync users with people records' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (values: PersonFormData) => {
    try {
      const formData = {
        ...values,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth).format('YYYY-MM-DD') : undefined,
      };

      // Remove undefined values
      Object.keys(formData).forEach(key => {
        if (formData[key as keyof PersonFormData] === undefined) {
          delete formData[key as keyof PersonFormData];
        }
      });

      if (editingPerson) {
        await peopleService.updatePerson(editingPerson.id, formData);
        setPeople(people.map(p =>
          p.id === editingPerson.id
            ? { ...p, ...formData, updatedAt: new Date().toISOString() }
            : p
        ));
        message.success({ content: 'Person updated successfully' });
      } else {
        const newPersonId = await peopleService.createPerson(formData, user?.uid || '');

        // Create or assign family if not already set
        let familyId = formData.familyId;
        if (!familyId && (formData.roles?.includes('parent') || formData.roles?.includes('guardian'))) {
          const familyName = `${formData.lastName} Family`;
          familyId = await familiesService.createFamily({
            name: familyName,
            primaryPersonId: newPersonId,
            memberIds: [newPersonId],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user?.uid || ''
          });
          await peopleService.updatePerson(newPersonId, { familyId });
        }

        const newPerson: Person = {
          id: newPersonId,
          ...formData,
          familyId,
          hasAccount: false,
          relationships: [],
          contactPreferences: [],
          programs: [],
          teams: [],
          groups: formData.groups || [],
          source: 'manual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          isActive: true,
        };
        setPeople([...people, newPerson]);
        await loadFamilies();
        message.success({ content: 'Person added successfully' });
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('❌ Error saving person:', error);
      message.error({ content: 'Failed to save person' });
    }
  };

  const getRoleColor = (role: PersonRole) => {
    const colors = {
      parent: 'blue',
      guardian: 'cyan',
      athlete: 'green',
      grandparent: 'magenta',
      relative: 'geekblue',
      other: 'default',
    };
    return colors[role] || 'default';
  };

  const calculateAge = (dateOfBirth: string) => {
    return dayjs().diff(dayjs(dateOfBirth), 'year');
  };

  const peopleColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: Person) => {
        const linkedUser = users.find(u => u.uid === record.userId);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar
              size={40}
              src={record.photoURL}
              icon={<UserOutlined />}
              style={{
                backgroundColor: record.hasAccount ?
                  (linkedUser?.systemRole === 'owner' ? '#722ed1' :
                    linkedUser?.systemRole === 'admin' ? '#f5222d' :
                    linkedUser?.systemRole === 'coach' ? '#fa8c16' :
                    linkedUser?.systemRole === 'teamManager' ? '#1890ff' : '#52c41a') : '#d9d9d9'
              }}
              onError={() => true}
            />
            <div>
              <div style={{ fontWeight: 500 }}>
                {record.firstName} {record.lastName}
                {record.hasAccount && (
                  <Tag
                    color={linkedUser?.systemRole === 'owner' ? 'purple' :
                      linkedUser?.systemRole === 'admin' ? 'red' :
                      linkedUser?.systemRole === 'coach' ? 'orange' :
                      linkedUser?.systemRole === 'teamManager' ? 'blue' : 'green'}
                    style={{ marginLeft: 8 }}
                  >
                    {linkedUser?.systemRole === 'owner' ? 'Owner Account' :
                      linkedUser?.systemRole === 'admin' ? 'Admin Account' :
                      linkedUser?.systemRole === 'coach' ? 'Coach Account' :
                      linkedUser?.systemRole === 'teamManager' ? 'Team Manager Account' : 'User Account'}
                  </Tag>
                )}
              </div>
              <Text type="secondary">{record.email}</Text>
              {record.userId && (
                <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                  ID: {record.userId.substring(0, 8)}...
                </Text>
              )}
              {linkedUser && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  🔗 Linked to {linkedUser.displayName || 'User Account'}
                </Text>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Roles',
      key: 'roles',
      render: (record: Person) => (
        <div>
          {(record.roles || []).map(role => (
            <Tag key={role} color={getRoleColor(role)} style={{ marginBottom: '4px' }}>
              {role}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: Person) => (
        <div>
          {record.phone && <div>{record.phone}</div>}
          {record.dateOfBirth && (
            <Text type="secondary">Age: {calculateAge(record.dateOfBirth)}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Family',
      key: 'family',
      render: (record: Person) => {
        if (!record.familyId) return <Text type="secondary">—</Text>;
        const family = families.find(f => f.id === record.familyId);
        const primaryPerson = people.find(p => p.id === family?.primaryPersonId);
        const familyMembers = people.filter(p => p.familyId === record.familyId && p.id !== record.id);
        return (
          <div>
            <Tag icon={<HomeOutlined />} color="blue" style={{ marginBottom: 4 }}>
              {family?.name || 'Family'}
            </Tag>
            {primaryPerson && (
              <div style={{ fontSize: '12px', marginBottom: 2 }}>
                <Text strong>Primary:</Text> {primaryPerson.firstName} {primaryPerson.lastName}
              </div>
            )}
            {familyMembers.length > 0 && (
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                {familyMembers.map(m => `${m.firstName} ${m.lastName}`).join(', ')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Source',
      key: 'source',
      render: (record: Person) => (
        <Tag color={record.source === 'signup' ? 'green' : record.source === 'manual' ? 'orange' : 'blue'}>
          {record.source}
        </Tag>
      ),
    },
    {
      title: 'System Role',
      key: 'systemRole',
      render: (record: Person) => {
        const linkedUser = users.find(u => u.uid === record.userId);
        if (!linkedUser) return <Text type="secondary">—</Text>;

        return role === 'owner' && editingUser === linkedUser.uid ? (
          <Select
            value={linkedUser.systemRole}
            onChange={(value) => updateUserRole(linkedUser.uid, value)}
            onBlur={() => { setEditingUser(null); }}
            style={{ width: 120 }}
            autoFocus
          >
            <Select.Option value="user">User</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="coach">Coach</Select.Option>
            <Select.Option value="teamManager">Team Manager</Select.Option>
            <Select.Option value="owner">Owner</Select.Option>
          </Select>
        ) : (
          <Space>
            <Tag
              icon={linkedUser.systemRole === 'owner' ? <CrownOutlined /> :
                linkedUser.systemRole === 'admin' ? <SafetyOutlined /> :
                linkedUser.systemRole === 'coach' ? <TeamOutlined /> :
                linkedUser.systemRole === 'teamManager' ? <SettingOutlined /> : <UserOutlined />}
              color={linkedUser.systemRole === 'owner' ? 'purple' :
                linkedUser.systemRole === 'admin' ? 'red' :
                linkedUser.systemRole === 'coach' ? 'orange' :
                linkedUser.systemRole === 'teamManager' ? 'blue' : 'default'}
            >
              {linkedUser.systemRole === 'owner' ? 'Owner' :
                linkedUser.systemRole === 'admin' ? 'Admin' :
                linkedUser.systemRole === 'coach' ? 'Coach' :
                linkedUser.systemRole === 'teamManager' ? 'Team Manager' : linkedUser.systemRole}
            </Tag>
            {role === 'owner' && (
              <Button
                size="small"
                type="link"
                onClick={() => { setEditingUser(linkedUser.uid); }}
              >
                Edit
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Person) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => { handleEditPerson(record); }}
          >
            Edit
          </Button>
          {record.userId === user?.uid && (
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => { setProfileModalVisible(true); }}
            >
              Profile
            </Button>
          )}
          <Popconfirm
            title="Delete Person"
            description="Are you sure you want to delete this person?"
            onConfirm={() => {
              const family = families.find(f => f.id === record.familyId);
              if (family?.primaryPersonId === record.id) {
                setPersonToDelete(record);
                setDeletePrimaryModalVisible(true);
                return;
              }
              handleDeletePerson(record.id);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns = [
    {
      title: 'User',
      key: 'user',
      render: (record: User) => {
        const linkedPerson = people.find(p => p.userId === record.uid);
        return (
          <Space>
            <Avatar
              icon={<UserOutlined />}
              style={{
                backgroundColor: record.systemRole === 'owner' ? '#722ed1' :
                  record.systemRole === 'admin' ? '#f5222d' : '#8c8c8c'
              }}
            >
              {(record.displayName || record.email || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 500 }}>
                {record.displayName || 'Unknown User'}
                {!linkedPerson && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    Unlinked
                  </Tag>
                )}
                {linkedPerson && (
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    Linked
                  </Tag>
                )}
              </div>
              <Text type="secondary">{record.email || 'No email'}</Text>
              {linkedPerson && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  🔗 {linkedPerson.firstName} {linkedPerson.lastName}
                </Text>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: 'System Role',
      key: 'systemRole',
      render: (record: User) => (
        editingUser === record.uid ? (
          <Select
            value={record.systemRole}
            onChange={(value) => updateUserRole(record.uid, value)}
            style={{ width: 120 }}
          >
            <Select.Option value="user">User</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="coach">Coach</Select.Option>
            <Select.Option value="teamManager">Team Manager</Select.Option>
            {role === 'owner' && <Select.Option value="owner">Owner</Select.Option>}
          </Select>
        ) : (
          <Tag
            icon={record.systemRole === 'owner' ? <CrownOutlined /> :
              record.systemRole === 'admin' ? <SafetyOutlined /> :
              record.systemRole === 'coach' ? <TeamOutlined /> :
              record.systemRole === 'teamManager' ? <SettingOutlined /> : <UserOutlined />}
            color={record.systemRole === 'owner' ? 'purple' :
              record.systemRole === 'admin' ? 'red' :
              record.systemRole === 'coach' ? 'orange' :
              record.systemRole === 'teamManager' ? 'blue' : 'default'}
          >
            {record.systemRole === 'owner' ? 'Owner' :
              record.systemRole === 'admin' ? 'Admin' :
              record.systemRole === 'coach' ? 'Coach' :
              record.systemRole === 'teamManager' ? 'Team Manager' : 'User'}
          </Tag>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: User) => (
        role === 'owner' ? (
          editingUser === record.uid ? (
            <Button size="small" onClick={() => { setEditingUser(null); }}>
              Cancel
            </Button>
          ) : (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => { setEditingUser(record.uid); }}
            >
              Edit Role
            </Button>
          )
        ) : null
      ),
    },
  ];

  const getFilteredPeople = () => {
    switch (activeTab) {
    case 'accounts':
      return people.filter(p => p.hasAccount);
    case 'families':
      return people.filter(p => p.familyId);
    case 'athletes':
      return people.filter(p => (p.roles || []).includes('athlete'));
    case 'parents':
      return people.filter(p => ((p.roles || []).includes('parent') || (p.roles || []).includes('guardian')));
    default:
      return people;
    }
  };

  const filteredPeople = getFilteredPeople();
  const accountHolders = people.filter(p => p.hasAccount);
  const familyMembers = people.filter(p => p.familyId);
  const athletes = people.filter(p => (p.roles || []).includes('athlete'));

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              People Management
            </Title>
            <Text type="secondary">
              {people.length} Total People
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => activeTab === 'accounts' ? loadUsers() : loadPeople()}
                loading={loading}
              >
                Refresh
              </Button>
              {(role === 'admin' || role === 'owner') && (
                <Button
                  type="default"
                  loading={syncing}
                  onClick={handleSyncUsers}
                >
                  Sync Users
                </Button>
              )}
              <Button
                icon={<LinkOutlined />}
                onClick={() => setLinkModalVisible(true)}
                disabled={selectedPeople.length < 2}
              >
                Link Family ({selectedPeople.length})
              </Button>
              <Button
                icon={<MergeCellsOutlined />}
                onClick={() => setMergeModalVisible(true)}
                disabled={selectedPeople.length !== 2}
              >
                Merge Duplicates
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddPerson}
              >
                Add Person
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total People"
              value={people.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Account Holders"
              value={accountHolders.length}
              prefix={<CrownOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Family Members"
              value={familyMembers.length}
              prefix={<HomeOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Athletes"
              value={athletes.length}
              prefix={<TeamOutlined />}
              styles={{ content: { color: '#f5222d' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* People Table with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'all',
              label: `All People (${people.length})`
            },
            {
              key: 'accounts',
              label: `Account Holders (${accountHolders.length})`
            },
            {
              key: 'families',
              label: `Family Members (${familyMembers.length})`
            },
            {
              key: 'athletes',
              label: `Athletes (${athletes.length})`
            },
            {
              key: 'parents',
              label: `Parents (${people.filter(p => ((p.roles || []).includes('parent') || (p.roles || []).includes('guardian'))).length})`
            }
          ]}
        />

        <Spin spinning={loading}>
          <Table
            columns={activeTab === 'accounts' ? userColumns : peopleColumns}
            dataSource={activeTab === 'accounts' ? users as any : filteredPeople}
            rowKey={activeTab === 'accounts' ? 'uid' : 'id'}
            rowSelection={activeTab !== 'accounts' ? {
              selectedRowKeys: selectedPeople,
              onChange: (keys) => setSelectedPeople(keys as string[]),
            } : undefined}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} ${activeTab === 'accounts' ? 'users' : 'people'}`,
              onChange: (page, size) => {
                setPagination({ current: page, pageSize: size || 15 });
                if (size !== pagination.pageSize) {
                  saveUserPreferences(size || 15);
                }
              },
            }}
            locale={{
              emptyText: activeTab === 'accounts' ? 'No users found' : 'No people found'
            }}
          />
        </Spin>
      </Card>

      {/* Add/Edit Person Modal */}
      <Modal
        title={editingPerson ? 'Edit Person' : 'Add New Person'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Please enter valid email' }]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sex" label="Sex">
                <Select placeholder="Select sex">
                  <Select.Option value="male">Male</Select.Option>
                  <Select.Option value="female">Female</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="roles"
                label="Family Roles"
                rules={[{ required: true, message: 'Please select at least one role' }]}
              >
                <Select mode="multiple" placeholder="Select family roles">
                  <Select.Option value="parent">Parent</Select.Option>
                  <Select.Option value="guardian">Guardian</Select.Option>
                  <Select.Option value="athlete">Athlete</Select.Option>
                  <Select.Option value="grandparent">Grandparent</Select.Option>
                  <Select.Option value="relative">Relative</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Address">
            <Input placeholder="Enter street address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City">
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State">
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="zipCode" label="Zip Code">
                <Input placeholder="Enter zip code" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="schoolName" label="School Name">
                <Input placeholder="Enter school name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="graduationYear" label="Graduation Year">
                <Input type="number" placeholder="Enter graduation year" />
              </Form.Item>
            </Col>
          </Row>

          {/* Family Members */}
          <Form.Item label="Family">
            <Space orientation="vertical" style={{ width: '100%' }}>
              {!editingPerson && (
                <Form.Item name="familyId" noStyle>
                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.lastName !== curr.lastName}>
                    {({ getFieldValue }) => {
                      const lastName = getFieldValue('lastName');
                      return (
                        <Select
                          placeholder={lastName ? `Create new: ${lastName} Family` : 'Select existing family or create new'}
                          allowClear
                          showSearch
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={families.map(f => {
                            const primaryPerson = people.find(p => p.id === f.primaryPersonId);
                            return {
                              label: `${f.name} - ${primaryPerson?.firstName || ''} ${primaryPerson?.lastName || ''} (${primaryPerson?.email || 'No email'})`,
                              value: f.id
                            };
                          })}
                        />
                      );
                    }}
                  </Form.Item>
                </Form.Item>
              )}
              {editingPerson?.roles?.includes('athlete') && !editingPerson?.familyId && (
                <div style={{ padding: 8, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, marginBottom: 8 }}>
                  <Text type="warning">Athletes cannot be primary family members. Link this athlete to a parent/guardian instead.</Text>
                </div>
              )}
              {editingPerson?.familyId ? (() => {
                const family = families.find(f => f.id === editingPerson.familyId);
                return (
                  <div>
                    <Tag icon={<HomeOutlined />} color="blue" style={{ marginBottom: 8 }}>
                      {family?.name || editingPerson.familyId}
                    </Tag>
                    <div style={{ marginBottom: 8, padding: 12, border: '1px solid var(--ant-color-border)', borderRadius: 4 }}>
                      {people
                        .filter(p => p.familyId === editingPerson.familyId)
                        .map(m => (
                          <div key={m.id} style={{ marginBottom: 4 }}>
                            <Tag
                              color={m.id === family?.primaryPersonId ? 'blue' : 'default'}
                              closable={m.id !== family?.primaryPersonId}
                              onClose={async () => {
                                await peopleService.updatePerson(m.id, { familyId: undefined });
                                loadPeople();
                              }}
                            >
                              {m.firstName} {m.lastName} {m.id === family?.primaryPersonId && '(Primary)'}
                            </Tag>
                            {m.email && <Text type="secondary" style={{ fontSize: '12px' }}>({m.email})</Text>}
                          </div>
                        ))}
                    </div>
                    <Button
                      size="small"
                      danger
                      onClick={async () => {
                        if (editingPerson?.id) {
                          await peopleService.updatePerson(editingPerson.id, { familyId: undefined });
                          setEditingPerson({ ...editingPerson, familyId: undefined });
                          loadPeople();
                        }
                      }}
                    >
                      Unlink from Family
                    </Button>
                  </div>
                );
              })() : null}
            </Space>
          </Form.Item>

          {/* User ID - Only show if person has account */}
          {editingPerson?.userId && (
            <Form.Item label="User ID">
              <Input
                value={editingPerson.userId}
                disabled
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPerson ? 'Update Person' : 'Add Person'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Profile Settings Modal */}
      <Modal
        title="Profile Settings"
        open={profileModalVisible}
        onCancel={() => { setProfileModalVisible(false); }}
        onOk={handleProfileSave}
        okText="Save Changes"
        width={500}
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Profile Picture */}
          <div style={{ textAlign: 'center' }}>
            <Avatar
              size={80}
              src={photoURL || user?.photoURL}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#00d4ff', marginBottom: 16, cursor: 'pointer' }}
              onClick={() => document.getElementById('photoUrlInput')?.focus()}
            />
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Profile Picture URL</label>
              <Input
                id="photoUrlInput"
                placeholder="Enter image URL or click avatar above"
                value={photoURL}
                onChange={(e) => { setPhotoURL(e.target.value); }}
                prefix={<CameraOutlined />}
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); }}
              placeholder="Enter display name"
              maxLength={50}
            />
          </div>

          {/* User ID */}
          {user?.uid && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>User ID</label>
              <Input
                value={user.uid}
                disabled
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>
          )}

          {/* Theme Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid #f0f0f0'
          }}>
            <Space>
              <BulbOutlined />
              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </Space>
            <Switch
              checked={isDarkMode}
              onChange={() => dispatch(toggleTheme())}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
            />
          </div>
        </Space>
      </Modal>

      {/* Link Family Modal */}
      <Modal
        title="Link Family Members"
        open={linkModalVisible}
        onCancel={() => { setLinkModalVisible(false); setSelectedPeople([]); }}
        onOk={async () => {
          if (selectedPeople.length < 2) {
            message.warning({ content: 'Select at least 2 people to link' });
            return;
          }
          try {
            const primaryPerson = people.find(p => p.id === selectedPeople[0]);
            if (!primaryPerson) return;

            if ((primaryPerson.roles || []).includes('athlete')) {
              message.error({ content: 'First person must be parent/guardian, not athlete' });
              return;
            }

            const familyId = await familiesService.createFamily({
              name: `${primaryPerson.lastName} Family`,
              primaryPersonId: selectedPeople[0],
              memberIds: selectedPeople,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: user?.uid || ''
            });

            for (const personId of selectedPeople) {
              await peopleService.updatePerson(personId, { familyId });
            }

            message.success({ content: `Created family with ${selectedPeople.length} members` });
            setLinkModalVisible(false);
            setSelectedPeople([]);
            await Promise.all([loadPeople(), loadFamilies()]);
          } catch (error) {
            message.error({ content: 'Failed to link family members' });
            console.log(`Failed to link family members, ${error}`);
          }
        }}
        width={600}
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
          <Text strong>First person selected will be the primary family member (must be parent/guardian)</Text>
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select people to link as family"
          value={selectedPeople}
          onChange={setSelectedPeople}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={people.filter(p => !p.familyId).map(p => ({
            label: `${p.firstName} ${p.lastName} (${(p.roles || []).join(', ')}) - ${p.email || 'No email'}`,
            value: p.id
          }))}
        />
      </Modal>

      {/* Merge Duplicates Modal */}
      <Modal
        title="Merge Duplicate People"
        open={mergeModalVisible}
        onCancel={() => { setMergeModalVisible(false); }}
        onOk={async () => {
          if (selectedPeople.length !== 2) return;
          try {
            const person1 = people.find(p => p.id === selectedPeople[0]);
            const person2 = people.find(p => p.id === selectedPeople[1]);
            if (!person1 || !person2) return;

            const merged: any = { id: selectedPeople[0] };
            const fields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'sex', 'address', 'city', 'state', 'zipCode', 'schoolName', 'graduationYear'];

            fields.forEach(field => {
              const val1 = person1[field as keyof Person];
              const val2 = person2[field as keyof Person];
              merged[field] = document.querySelector(`input[name="merge-${field}"]:checked`)?.getAttribute('value') === '1' ? val1 : val2;
            });

            merged.roles = [...new Set([...(person1.roles || []), ...(person2.roles || [])])];

            await peopleService.updatePerson(selectedPeople[0], merged);
            await peopleService.deletePerson(selectedPeople[1]);

            message.success({ content: 'People merged successfully' });
            setMergeModalVisible(false);
            setSelectedPeople([]);
            loadPeople();
          } catch (error) {
            message.error({ content: 'Failed to merge people' });
            console.log(`Failed to merge people, ${error}`);
          }
        }}
        width={800}
      >
        {selectedPeople.length === 2 ? (() => {
          const person1 = people.find(p => p.id === selectedPeople[0]);
          const person2 = people.find(p => p.id === selectedPeople[1]);
          if (!person1 || !person2) return null;

          const fields = [
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'dateOfBirth', label: 'Date of Birth' },
            { key: 'sex', label: 'Sex' },
            { key: 'address', label: 'Address' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'zipCode', label: 'Zip Code' },
            { key: 'schoolName', label: 'School' },
            { key: 'graduationYear', label: 'Graduation Year' },
          ];

          return (
            <div>
              <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                <Text strong>Select which value to keep for each field. Person 2 will be deleted.</Text>
              </div>
              {fields.map(({ key, label }) => {
                const val1 = person1[key as keyof Person] as string | undefined;
                const val2 = person2[key as keyof Person] as string | undefined;
                if (!val1 && !val2) return null;
                return (
                  <div key={key} style={{ marginBottom: 12, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>{label}</div>
                    <Space orientation="vertical">
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="radio" name={`merge-${key}`} value="1" defaultChecked style={{ marginRight: 8 }} />
                        <Tag color="blue">Person 1:</Tag> {val1 || <Text type="secondary">Empty</Text>}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="radio" name={`merge-${key}`} value="2" style={{ marginRight: 8 }} />
                        <Tag color="green">Person 2:</Tag> {val2 || <Text type="secondary">Empty</Text>}
                      </label>
                    </Space>
                  </div>
                );
              })}
            </div>
          );
        })() : (
          <Text type="secondary">Select exactly 2 people from the table using checkboxes</Text>
        )}
      </Modal>

      {/* Delete Primary Member Modal */}
      <Modal
        title="Delete Primary Family Member"
        open={deletePrimaryModalVisible}
        onCancel={() => { setDeletePrimaryModalVisible(false); setPersonToDelete(null); setNewPrimaryId(''); }}
        onOk={async () => {
          if (!personToDelete) return;
          const family = families.find(f => f.id === personToDelete.familyId);
          if (!family) return;

          const otherAdults = people.filter(p =>
            p.familyId === family.id &&
            p.id !== personToDelete.id &&
            (p.roles?.includes('parent') || p.roles?.includes('guardian'))
          );

          if (otherAdults.length > 0 && !newPrimaryId) {
            message.error({ content: 'Please select a new primary member' });
            return;
          }

          try {
            if (otherAdults.length > 0) {
              await familiesService.updateFamily(family.id, { primaryPersonId: newPrimaryId });
              await peopleService.deletePerson(personToDelete.id);
              setPeople(people.filter(p => p.id !== personToDelete.id));
              message.success({ content: 'Primary member changed and person deleted' });
            } else {
              for (const personId of family.memberIds) {
                if (personId !== personToDelete.id) {
                  await peopleService.updatePerson(personId, { familyId: undefined });
                }
              }
              await familiesService.deleteFamily(family.id);
              await peopleService.deletePerson(personToDelete.id);
              setPeople(people.filter(p => p.id !== personToDelete.id));
              message.success({ content: 'Person and family deleted successfully' });
            }
            setDeletePrimaryModalVisible(false);
            setPersonToDelete(null);
            setNewPrimaryId('');
            await Promise.all([loadPeople(), loadFamilies()]);
          } catch (error) {
            message.error({ content: 'Failed to delete person' });
            console.log(`Failed to delete person, ${error}`);
          }
        }}
        width={500}
      >
        {personToDelete && (() => {
          const family = families.find(f => f.id === personToDelete.familyId);
          if (!family) return null;

          const otherAdults = people.filter(p =>
            p.familyId === family.id &&
            p.id !== personToDelete.id &&
            (p.roles?.includes('parent') || p.roles?.includes('guardian'))
          );

          return (
            <div>
              {otherAdults.length > 0 ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Text>This person is the primary family member. Please select a new primary member before deleting.</Text>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>New Primary Member</label>
                    <Select
                      style={{ width: '100%' }}
                      value={newPrimaryId}
                      onChange={(value) => setNewPrimaryId(value)}
                      placeholder="Select new primary member"
                      options={otherAdults.map(p => ({
                        label: `${p.firstName} ${p.lastName}`,
                        value: p.id
                      }))}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Text type="warning">This is the only adult in the family. Deleting this person will also delete the entire family and unlink all members.</Text>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}