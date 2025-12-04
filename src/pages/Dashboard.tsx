import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Typography, Space, Avatar } from 'antd';
import { TeamOutlined, DollarOutlined, TrophyOutlined, BarChartOutlined, UserOutlined } from '@ant-design/icons';
import type { RootState } from '../store/store';
import { setTeams, setLoading } from '../store/slices/teamsSlice';
import { teamsService } from '../services/firebaseTeams';
import ChatBox from '../components/Chat/ChatBox';

const { Title, Text } = Typography;

interface DashboardStats {
  totalTeams: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  activeTeams: number;
  spendingPercentage: number;
  avgBudget: number;
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const teams = useSelector((state: RootState) => state.teams.teams);
  const user = useSelector((state: RootState) => state.auth.user);
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    activeTeams: 0,
    spendingPercentage: 0,
    avgBudget: 0,
  });

  useEffect(() => {
    const loadTeams = async () => {
      try {
        dispatch(setLoading(true));
        const teamsData = await teamsService.getTeams();
        dispatch(setTeams(teamsData));
      } catch (error) {
        console.error('Failed to load teams:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    loadTeams();
  }, [dispatch]);

  useEffect(() => {
    if (teams.length > 0) {
      const totalBudget = teams.reduce((sum, t) => sum + (t.budget || 0), 0);
      const totalSpent = teams.reduce((sum, t) => sum + (t.spent || 0), 0);
      const totalRemaining = totalBudget - totalSpent;
      const activeTeams = teams.filter(t => t.status === 'active').length;
      const spendingPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      const avgBudget = totalBudget / teams.length;

      setStats({
        totalTeams: teams.length,
        totalBudget,
        totalSpent,
        totalRemaining,
        activeTeams,
        spendingPercentage: Math.round(spendingPercentage),
        avgBudget,
      });
    }
  }, [teams]);

  const getSpendingColor = (percentage: number): string => {
    if (percentage < 50) return '#22c55e'; // Green
    if (percentage < 80) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getHealthStatus = (percentage: number): string => {
    if (percentage < 50) return '✅ Good pace';
    if (percentage < 80) return '⚠️ Moderate pace';
    return '🚨 High pace';
  };

  // Sort teams by budget (highest first)
  const sortedTeamsByBudget = [...teams].sort((a, b) => b.budget - a.budget);
  
  // Get top 5 teams
  const topTeams = sortedTeamsByBudget.slice(0, 5);

  const columns = [
    {
      title: 'Team',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: record.status === 'active' ? '#52c41a' : '#d9d9d9' }}
            icon={<TeamOutlined />}
          />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number) => `$${(budget || 0).toLocaleString()}`,
    },
    {
      title: 'Spent',
      dataIndex: 'spent',
      key: 'spent',
      render: (spent: number) => `$${(spent || 0).toLocaleString()}`,
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (record: any) => {
        const budget = record.budget || 0;
        const spent = record.spent || 0;
        const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        return (
          <Progress 
            percent={percent} 
            size="small"
            strokeColor={percent < 50 ? '#52c41a' : percent < 80 ? '#faad14' : '#ff4d4f'}
          />
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Welcome back, {user?.displayName || user?.email?.split('@')[0]}! 👋</Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Teams"
              value={stats.totalTeams}
              prefix={<TeamOutlined />}
              suffix={<Text type="secondary">({stats.activeTeams} active)</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Budget"
              value={stats.totalBudget}
              prefix={<DollarOutlined />}
              precision={0}
              formatter={(value) => `$${value?.toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Spent"
              value={stats.totalSpent}
              prefix={<BarChartOutlined />}
              precision={0}
              formatter={(value) => `$${value?.toLocaleString()}`}
              styles={{ content: { color: getSpendingColor(stats.spendingPercentage) } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Budget Used"
              value={stats.spendingPercentage}
              suffix="%"
              prefix={<TrophyOutlined />}
              styles={{ content: { color: getSpendingColor(stats.spendingPercentage) } }}
            />
            <Progress 
              percent={stats.spendingPercentage} 
              showInfo={false}
              strokeColor={getSpendingColor(stats.spendingPercentage)}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Teams Overview & Chat */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Teams Overview" style={{ height: '100%' }}>
            {teams.length > 0 ? (
              <Table
                columns={columns}
                dataSource={teams}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <TeamOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Text type="secondary">No teams yet. Create your first team in Teams management!</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Team Chat" style={{ height: '100%' }}>
            <ChatBox />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
