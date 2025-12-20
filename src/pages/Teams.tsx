import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Button,
  Space,
  Typography,
  Table,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Statistic,
  Row,
  Col,
  Tooltip,
  Modal,
  Spin,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import {
  setLoading,
  setTeams,
  addTeam,
  updateTeam,
  deleteTeam as deleteTeamAction,
  setError,
} from '../store/slices/teamsSlice';
import { teamsService } from '../services/firebaseTeams';

const { Title, Text } = Typography;


export default function Teams() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);
  const teams = useSelector((state: RootState) => state.teams.teams);
  const loading = useSelector((state: RootState) => state.teams.loading);

  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingTeam, setPendingTeam] = useState<any | null>(null);
  const [error, setLocalError] = useState<string>('');
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>('');

  // Load teams and coaches on mount
  useEffect(() => {
    if (user?.uid) {
      loadTeams();
      loadCoaches();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!modalVisible) {
      setEditingId(null);
      setSelectedCoach('');
      setLocalError('');
      setPendingTeam(null);
    }
  }, [modalVisible]);

  // Child component: mounted only when modalVisible to own the Form instance
  const TeamModalForm = ({ initialTeam, editingIdProp, onSubmit, onCancel, coachesProp }: any) => {
    const [localForm] = Form.useForm();

    useEffect(() => {
      if (initialTeam && editingIdProp) {
        localForm.setFieldsValue({
          name: initialTeam.name || '',
          budget: (initialTeam.budget || 0).toString(),
          status: initialTeam.status || 'active',
          coachId: initialTeam.coachId || undefined,
        });
      } else {
        localForm.resetFields();
        localForm.setFieldsValue({ status: 'active' });
      }
    }, [initialTeam, editingIdProp]);

    return (
      <Form form={localForm} layout="vertical" onFinish={onSubmit}>
        {error && (
          <div style={{ marginBottom: 12, color: '#ff4d4f' }}>{error}</div>
        )}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="Team Name" rules={[{ required: true, message: 'Please enter team name' }]}>
              <Input placeholder="e.g., 12U Softball" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="budget" label="Budget ($)" rules={[{ required: true, message: 'Please enter budget' }]}>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="status" label="Status">
              <Select>
                <Select.Option value="active">Active</Select.Option>
                <Select.Option value="inactive">Inactive</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="coachId" label="Coach">
              <Select allowClear placeholder="Assign a coach">
                <Select.Option value="">Unassigned</Select.Option>
                {coachesProp.map((c: any) => (
                  <Select.Option key={c.uid} value={c.uid} title={c.email}>
                    {c.displayName || c.email?.split('@')[0]}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" icon={editingIdProp ? <SaveOutlined /> : <PlusOutlined />}>
              {editingIdProp ? 'Update Team' : 'Add Team'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  const loadCoaches = async () => {
    try {
      const { ref, get } = await import('firebase/database');
      const { db } = await import('../services/firebase');
      const usersSnapshot = await get(ref(db, 'users'));
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const coachList = Object.entries(usersData || {})
          .filter(([_, userData]: any) => ['coach', 'admin', 'owner'].includes(userData.role))
          .map(([uid, userData]: any) => ({ uid, ...userData }));
        setCoaches(coachList);
      }
    } catch (err) {
      console.error('Failed to load coaches:', err);
    }
  };

  const loadTeams = async () => {
    if (!user?.uid) return;
    dispatch(setLoading(true));
    try {
      const userTeams = await teamsService.getUserTeams(user.uid);
      dispatch(setTeams(userTeams));
      setLocalError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load teams';
      setLocalError(errorMsg);
      dispatch(setError(errorMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const navigate = useNavigate();

  const submitTeam = async (values: any) => {
    if (!user?.uid) return;

    try {
      const budget = parseFloat(values.budget || 0);
      setLocalError('');

      if (editingId) {
        await teamsService.updateTeam(editingId, {
          name: values.name,
          budget,
          status: values.status,
          coachId: values.coachId || undefined,
        });
        const updatedTeams = teams.map(t =>
          t.id === editingId
            ? { ...t, name: values.name, budget, status: values.status, coachId: values.coachId }
            : t
        );
        dispatch(setTeams(updatedTeams));
        message.success('Team updated');
      } else {
        const newTeam = await teamsService.createTeam({
          name: values.name,
          budget,
          spent: 0,
          status: values.status,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          coachId: values.coachId || undefined,
        });
        dispatch(addTeam(newTeam));
        message.success('Team created');
      }

      setModalVisible(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Operation failed';
      setLocalError(errorMsg);
    }
  };

  const handleEdit = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setPendingTeam(team);
      setSelectedCoach(team.coachId || '');
      setEditingId(teamId);
      setModalVisible(true);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      try {
        await teamsService.deleteTeam(teamId);
        dispatch(deleteTeamAction(teamId));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Delete failed';
        setLocalError(errorMsg);
      }
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const totalBudget = teams.reduce((sum, t) => sum + (t.budget || 0), 0);
  const totalSpent = teams.reduce((sum, t) => sum + (t.spent || 0), 0);

  const columns = [
    {
      title: 'Team Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name || 'Unnamed Team'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={(status || 'active') === 'active' ? 'green' : 'default'}>
          {(status || 'active').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number) => `$${(budget || 0).toFixed(2)}`,
    },
    {
      title: 'Spent',
      dataIndex: 'spent',
      key: 'spent',
      render: (spent: number) => `$${(spent || 0).toFixed(2)}`,
    },
    {
      title: 'Remaining',
      key: 'remaining',
      render: (record: any) => {
        const remaining = (record.budget || 0) - (record.spent || 0);
        return (
          <Text style={{ color: remaining >= 0 ? '#52c41a' : '#ff4d4f' }}>
            ${remaining.toFixed(2)}
          </Text>
        );
      },
    },

    {
      title: 'Created By',
      dataIndex: 'userId',
      key: 'userId',
      render: (userId: string) => userId === user?.uid ? user?.displayName || user?.email?.split('@')[0] : userId ? 'Other User' : <Text type="secondary">Demo</Text>,
    },
    {
      title: 'Coach',
      dataIndex: 'coachId',
      key: 'coachId',
      render: (coachId: string, record: any) => {
        const coach = coaches.find(c => c.uid === coachId);
        const isAdmin = role === 'admin' || role === 'owner';
        
        if (!isAdmin) {
          return coach ? (
            <Tooltip title={coach.email}>
              {coach.displayName || coach.email?.split('@')[0]}
            </Tooltip>
          ) : <Text type="secondary">Unassigned</Text>;
        }
        
        return (
          <Select
            size="small"
            style={{ width: 150 }}
            value={coachId || undefined}
            placeholder="Select coach"
            onChange={async (value) => {
              try {
                await teamsService.updateTeam(record.id, { coachId: value });
                await loadTeams();
              } catch (err) {
                console.error('Failed to update coach:', err);
              }
            }}
          >
            <Select.Option value="">Unassigned</Select.Option>
            {coaches.map(c => (
              <Select.Option key={c.uid} value={c.uid} title={c.email}>
                {c.displayName || c.email?.split('@')[0]}
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => {
        const isOwner = record.userId === user?.uid;
        const isAdmin = role === 'admin' || role === 'owner';
        const canEdit = isOwner || isAdmin;
        const isDemoTeam = !record.userId;
        
        return (
          <Space>
              <Button
                size="small"
                onClick={() => { navigate(`/teams/${record.id}/chat`); }}
                title="Open Team Chat"
              >
                Chat
              </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => { handleEdit(record.id); }}
              disabled={isDemoTeam && !isAdmin}
              title={isDemoTeam && !isAdmin ? 'Demo team - read only' : ''}
            />
            <Popconfirm
              title="Delete Team"
              description="Are you sure you want to delete this team?"
              onConfirm={() => handleDelete(record.id)}
              disabled={!canEdit || isDemoTeam}
            >
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
                disabled={!canEdit || isDemoTeam}
                title={isDemoTeam ? 'Demo team - cannot delete' : !canEdit ? 'Only team creator can delete' : ''}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>Teams Management</Title>
            <Text type="secondary">Manage your youth sports teams and budgets</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadTeams}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => { setEditingId(null); setModalVisible(true); }}
              >
                Add Team
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Summary Statistics */}
      {teams.length > 0 && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic title="Total Teams" value={teams.length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Budget"
                value={totalBudget}
                precision={2}
                prefix="$"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Spent"
                value={totalSpent}
                precision={2}
                prefix="$"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Remaining"
                value={totalBudget - totalSpent}
                precision={2}
                prefix="$"
                styles={{ content: { color: totalBudget - totalSpent >= 0 ? '#3f8600' : '#cf1322' } }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Teams Table */}
      <Modal
        title={editingId ? 'Edit Team' : 'Add New Team'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        {modalVisible && (
          <TeamModalForm
            initialTeam={pendingTeam}
            editingIdProp={editingId}
            onSubmit={submitTeam}
            onCancel={handleCancel}
            coachesProp={coaches}
          />
        )}
      </Modal>
      <Card title={`Your Teams (${teams.length})`}>
        <Table
          columns={columns}
          dataSource={teams}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: 'No teams yet. Create your first team above!'
          }}
          pagination={false}
        />
      </Card>
    </div>
  );
}
