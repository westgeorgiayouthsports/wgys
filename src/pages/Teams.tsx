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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { RootState } from '../store/store';
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

interface FormData {
  name: string;
  budget: string;
  status: 'active' | 'inactive';
}

export default function Teams() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const teams = useSelector((state: RootState) => state.teams.teams);
  const loading = useSelector((state: RootState) => state.teams.loading);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    budget: '',
    status: 'active',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setLocalError] = useState<string>('');

  // Load teams on mount
  useEffect(() => {
    if (user?.uid) {
      loadTeams();
    }
  }, [user?.uid]);

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



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    if (!formData.name.trim() || !formData.budget) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      setLocalError('');
      const budget = parseFloat(formData.budget);

      if (editingId) {
        // Update team
        await teamsService.updateTeam(editingId, {
          name: formData.name,
          budget,
          status: formData.status,
        });
        const updatedTeams = teams.map(t =>
          t.id === editingId
            ? { ...t, name: formData.name, budget, status: formData.status }
            : t
        );
        dispatch(setTeams(updatedTeams));
        setEditingId(null);
      } else {
        // Create team
        const newTeam = await teamsService.createTeam({
          name: formData.name,
          budget,
          spent: 0,
          status: formData.status,
          userId: user.uid,
        });
        dispatch(addTeam(newTeam));
      }

      setFormData({ name: '', budget: '', status: 'active' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Operation failed';
      setLocalError(errorMsg);
    }
  };

  const handleEdit = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setFormData({
        name: team.name,
        budget: team.budget.toString(),
        status: team.status,
      });
      setEditingId(teamId);
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
    setFormData({ name: '', budget: '', status: 'active' });
    setEditingId(null);
    setLocalError('');
  };

  const totalBudget = teams.reduce((sum, t) => sum + t.budget, 0);
  const totalSpent = teams.reduce((sum, t) => sum + t.spent, 0);

  const columns = [
    {
      title: 'Team Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number) => `$${budget.toFixed(2)}`,
    },
    {
      title: 'Spent',
      dataIndex: 'spent',
      key: 'spent',
      render: (spent: number) => `$${spent.toFixed(2)}`,
    },
    {
      title: 'Remaining',
      key: 'remaining',
      render: (record: any) => {
        const remaining = record.budget - record.spent;
        return (
          <Text style={{ color: remaining >= 0 ? '#52c41a' : '#ff4d4f' }}>
            ${remaining.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          />
          <Popconfirm
            title="Delete Team"
            description="Are you sure you want to delete this team?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>Teams Management</Title>
          <Text type="secondary">Manage your youth sports teams and budgets</Text>
        </div>

        {/* Form Section */}
        <Card 
          title={editingId ? 'Edit Team' : 'Add New Team'}
          style={{ marginBottom: '24px' }}
          extra={
            editingId ? (
              <Button icon={<CloseOutlined />} onClick={handleCancel}>
                Cancel
              </Button>
            ) : null
          }
        >
          <Form
            layout="vertical"
            onFinish={(values) => {
              const event = { preventDefault: () => {} } as React.FormEvent;
              setFormData({
                name: values.name,
                budget: values.budget.toString(),
                status: values.status,
              });
              handleSubmit(event);
            }}
            initialValues={formData}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="name"
                  label="Team Name"
                  rules={[{ required: true, message: 'Please enter team name' }]}
                >
                  <Input
                    placeholder="e.g., 12U Softball"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="budget"
                  label="Budget ($)"
                  rules={[{ required: true, message: 'Please enter budget' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={parseFloat(formData.budget) || 0}
                    onChange={(value) => setFormData(prev => ({ ...prev, budget: (value || 0).toString() }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="status" label="Status">
                  <Select
                    value={formData.status}
                    onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <Select.Option value="active">Active</Select.Option>
                    <Select.Option value="inactive">Inactive</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={editingId ? <SaveOutlined /> : <PlusOutlined />}
              >
                {editingId ? 'Update Team' : 'Add Team'}
              </Button>
            </Form.Item>
          </Form>
        </Card>

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
