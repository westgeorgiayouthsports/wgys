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
  Tabs,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import {
  setLoading,
  setTeams,
  addTeam,
  deleteTeam as deleteTeamAction,
  setError,
} from '../store/slices/teamsSlice';
import { teamsService } from '../services/firebaseTeams';
import { programsService } from '../services/firebasePrograms';
import { seasonsService } from '../services/firebaseSeasons';

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
  const [managers, setManagers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('teams');
  const [programs, setPrograms] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);

  // Load teams and coaches on mount
  useEffect(() => {
    if (user?.uid) {
      loadTeams();
      loadCoaches();
      loadPrograms();
      loadManagers();
    }
  }, [user?.uid]);
  const loadPrograms = async () => {
    try {
      const list = await programsService.getPrograms();
      setPrograms(list);
      try {
        const seas = await seasonsService.getSeasons();
        setSeasons(seas || []);
      } catch (e) {
        console.error('Failed to load seasons:', e);
      }
    } catch (err) {
      console.error('Failed to load programs:', err);
    }
  };

  useEffect(() => {
    if (!modalVisible) {
      setEditingId(null);
      setLocalError('');
      setPendingTeam(null);
    }
  }, [modalVisible]);

  // Child component: mounted only when modalVisible to own the Form instance
  const TeamModalForm = ({ initialTeam, editingIdProp, onSubmit, onCancel, coachesProp, managersProp }: any) => {
    const [localForm] = Form.useForm();

    useEffect(() => {
      if (initialTeam && editingIdProp) {
        localForm.setFieldsValue({
          programId: initialTeam.programId || undefined,
          name: initialTeam.name || '',
          budget: initialTeam.budget || 0,
          status: initialTeam.status || 'active',
          coachId: initialTeam.coachId || undefined,
          assistantCoachIds: initialTeam.assistantCoachIds || [],
          teamManagerId: initialTeam.teamManagerId || undefined,
        });
      } else {
        localForm.resetFields();
        localForm.setFieldsValue({ status: 'active' });
      }
    }, [initialTeam, editingIdProp, localForm]);

    return (
      <Form form={localForm} layout="vertical" onFinish={onSubmit}>
        {error && (
          <div style={{ marginBottom: 12, color: '#ff4d4f' }}>{error}</div>
        )}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="programId" label="Program" rules={[{ required: true, message: 'Select a program' }]}>
              <Select placeholder="Select program" showSearch optionFilterProp="label">
                {programs.map((p: any) => {
                  const rawSid = p?.season && typeof p.season === 'object' && p.season.name ? p.season.name : (p.seasonId || (typeof p.season === 'string' ? p.season : undefined));
                  const resolved = seasons.find((s: any) => s.id === rawSid)?.name || rawSid;
                  const label = `${resolved ? resolved + ' - ' : ''}${p.name}`;
                  return (
                    <Select.Option key={p.id} value={p.id} label={label}>
                      {label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
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
          <Col span={12}>
            <Form.Item label="Season">
              <Input
                value={(() => {
                  const selectedProgramId = localForm.getFieldValue('programId') || initialTeam?.programId;
                  const sel = programs.find((p: any) => p.id === selectedProgramId);
                  if (!sel) return '';
                  if (sel.season && typeof sel.season === 'object' && sel.season.name) return sel.season.name;
                  const sid = sel.seasonId || (typeof sel.season === 'string' ? sel.season : undefined);
                  const s = seasons.find((x: any) => x.id === sid);
                  return s?.name || sid || '';
                })()}
                disabled
              />
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

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="assistantCoachIds" label="Assistant Coaches">
              <Select mode="multiple" allowClear placeholder="Assign assistant coaches">
                {coachesProp.map((c: any) => (
                  <Select.Option key={c.uid} value={c.uid} title={c.email}>
                    {c.displayName || c.email?.split('@')[0]}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="teamManagerId" label="Team Manager">
              <Select allowClear placeholder="Assign a team manager">
                <Select.Option value="">Unassigned</Select.Option>
                {managersProp.map((m: any) => (
                  <Select.Option key={m.uid} value={m.uid} title={m.email}>
                    {m.displayName || m.email?.split('@')[0]}
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
          .filter(([, userData]: any) => ['coach', 'admin', 'owner'].includes(userData.role))
          .map(([uid, userData]: any) => ({ uid, ...userData }));
        setCoaches(coachList);
      }
    } catch (err) {
      console.error('Failed to load coaches:', err);
    }
  };

  const loadManagers = async () => {
    try {
      const { ref, get } = await import('firebase/database');
      const { db } = await import('../services/firebase');
      const usersSnapshot = await get(ref(db, 'users'));
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const managerList = Object.entries(usersData || {})
          .filter(([, userData]: any) => ['teamManager', 'admin', 'owner'].includes(userData.role))
          .map(([uid, userData]: any) => ({ uid, ...userData }));
        setManagers(managerList);
      }
    } catch (err) {
      console.error('Failed to load managers:', err);
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
        const program = programs.find(p => p.id === values.programId);
        await teamsService.updateTeam(editingId, {
          name: values.name,
          budget,
          status: values.status,
          coachId: values.coachId || undefined,
          assistantCoachIds: values.assistantCoachIds || [],
          teamManagerId: values.teamManagerId || undefined,
          programId: values.programId,
          seasonId: program?.seasonId,
          season: program?.season,
          year: program?.year,
          ageGroup: program?.ageGroup,
        });
        const updatedTeams = teams.map(t =>
          t.id === editingId
            ? { ...t, name: values.name, budget, status: values.status, coachId: values.coachId, programId: values.programId,
                seasonId: program?.seasonId,
                season: program?.season,
                year: program?.year,
                ageGroup: program?.ageGroup }
            : t
        );
        dispatch(setTeams(updatedTeams));
        message.success('Team updated');
      } else {
        const program = programs.find(p => p.id === values.programId);
        const newTeam = await teamsService.createTeam({
          name: values.name,
          budget,
          spent: 0,
          status: values.status,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          coachId: values.coachId || undefined,
          assistantCoachIds: values.assistantCoachIds || [],
          teamManagerId: values.teamManagerId || undefined,
          programId: values.programId,
          seasonId: program?.seasonId,
          season: program?.season,
          year: program?.year,
          ageGroup: program?.ageGroup,
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
      title: 'Staff',
      key: 'staff',
      render: (record: any) => (
        <Space wrap>
          <Tag color={record.coachId ? 'green' : 'default'}>Head Coach{record.coachId ? '' : ': none'}</Tag>
          <Tag color={record.teamManagerId ? 'blue' : 'default'}>Manager{record.teamManagerId ? '' : ': none'}</Tag>
          <Tag color={(record.assistantCoachIds?.length || 0) > 0 ? 'purple' : 'default'}>
            Assistants: {record.assistantCoachIds?.length || 0}
          </Tag>
        </Space>
      ),
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

  const staffColumns = [
    {
      title: 'Team',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name || 'Unnamed Team'}</Text>,
    },
    {
      title: 'Head Coach',
      dataIndex: 'coachId',
      key: 'coachId',
      render: (coachId: string, record: any) => (
        <Select
          size="small"
          style={{ width: 180 }}
          value={coachId || undefined}
          placeholder="Select head coach"
          onChange={async (value) => {
            try {
              await teamsService.updateTeam(record.id, { coachId: value || undefined });
              await loadTeams();
            } catch (err) {
              console.error('Failed to update head coach:', err);
            }
          }}
          allowClear
        >
          {coaches.map(c => (
            <Select.Option key={c.uid} value={c.uid} title={c.email}>
              {c.displayName || c.email?.split('@')[0]}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Assistant Coaches',
      dataIndex: 'assistantCoachIds',
      key: 'assistantCoachIds',
      render: (assistantCoachIds: string[] = [], record: any) => (
        <Select
          mode="multiple"
          size="small"
          style={{ minWidth: 220 }}
          value={assistantCoachIds}
          placeholder="Select assistant coaches"
          onChange={async (values) => {
            try {
              await teamsService.updateTeam(record.id, { assistantCoachIds: values });
              await loadTeams();
            } catch (err) {
              console.error('Failed to update assistant coaches:', err);
            }
          }}
          allowClear
        >
          {coaches.map(c => (
            <Select.Option key={c.uid} value={c.uid} title={c.email}>
              {c.displayName || c.email?.split('@')[0]}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Team Manager',
      dataIndex: 'teamManagerId',
      key: 'teamManagerId',
      render: (teamManagerId: string, record: any) => (
        <Select
          size="small"
          style={{ width: 200 }}
          value={teamManagerId || undefined}
          placeholder="Select team manager"
          onChange={async (value) => {
            try {
              await teamsService.updateTeam(record.id, { teamManagerId: value || undefined });
              await loadTeams();
            } catch (err) {
              console.error('Failed to update team manager:', err);
            }
          }}
          allowClear
        >
          {managers.map(m => (
            <Select.Option key={m.uid} value={m.uid} title={m.email}>
              {m.displayName || m.email?.split('@')[0]}
            </Select.Option>
          ))}
        </Select>
      ),
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

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'teams', label: `Teams (${teams.length})` },
        { key: 'staff', label: 'Staff' },
      ]} />

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
            managersProp={managers}
          />
        )}
      </Modal>
      {activeTab === 'teams' ? (
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
      ) : (
        <Card title="Team Staff">
          <Table
            columns={staffColumns}
            dataSource={teams}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'No teams available' }}
          />
        </Card>
      )}
    </div>
  );
}