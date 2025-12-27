import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Spin,
  Button,
  Empty,
  Tooltip,
  Popover,
  DatePicker,
  Modal,
} from 'antd';
import dayjs from 'dayjs';
import {
  EyeOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BankOutlined,
  AppstoreOutlined,
  BellOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import { setTeams, setLoading as _setLoading } from '../store/slices/teamsSlice';
import { teamsService } from '../services/firebaseTeams';
import { fetchWebsiteTrends } from '../services/analyticsClient';
import { programsService } from '../services/firebasePrograms';
import { SeasonStatusValues } from '../types/enums/season';
import { announcementsService } from '../services/firebaseAnnouncements';
import { registrationsService } from '../services/firebaseRegistrations';
import { programRegistrationsService } from '../services/firebaseProgramRegistrations';
import type { Program } from '../types/program';
import type { Announcement } from '../store/slices/announcementsSlice';
import type { Registration } from '../services/firebaseRegistrations';
import './Dashboard.css';

const { Title, Text, Link: AntLink } = Typography;

interface DashboardMetrics {
  websiteViews: number;
  totalRegistrants: number;
  moneyCollected: number;
  totalTeams: number;
  activeTeams: number;
  totalBudget: number;
  totalSpent: number;
  budgetUtilization: number;
  activePrograms: number;
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const teams = useSelector((state: RootState) => state.teams.teams);
  const user = useSelector((state: RootState) => state.auth.user);
  // const _loading = useSelector((state: RootState) => state.teams.loading);
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    websiteViews: 0,
    totalRegistrants: 0,
    moneyCollected: 0,
    totalTeams: 0,
    activeTeams: 0,
    totalBudget: 0,
    totalSpent: 0,
    budgetUtilization: 0,
    activePrograms: 0,
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const websiteViewsRange = useSelector((state: any) => state.ui?.websiteViewsRange || 30);
  const customRange = useSelector((state: any) => state.ui?.customRange || null);

  // Load all dashboard data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);

        // Fetch core data in parallel
        const [teamsData, programsData, announcementsData] = await Promise.all([
          teamsService.getTeams(),
          programsService.getPrograms(),
          announcementsService.getAnnouncements(),
        ]);

        dispatch(setTeams(teamsData));
        setPrograms(programsData);
        setAnnouncements(announcementsData.slice(0, 5)); // Top 5 recent

        // Try to fetch registrations (may fail due to permissions)
        try {
          const registrationsData = await registrationsService.getAllRegistrations();
          if (registrationsData && registrationsData.length) {
            setRegistrations(registrationsData.slice(0, 5)); // Top 5 recent
          } else {
            // Fallback: try program registrations (newer registration system)
            try {
              const progRegs = await programRegistrationsService.getAllProgramRegistrations();
              const mapped = progRegs.map((r) => ({
                id: r.id,
                teamId: r.programId || '',
                playerName: r.playerName || r.programName || 'Registrant',
                playerAge: 0,
                playerPosition: undefined,
                parentName: '',
                parentEmail: '',
                phoneNumber: '',
                fee: r.totalAmount || 0,
                paymentMethod: (r.paymentMethod || 'other') as 'stripe' | 'paypal' | 'square' | 'check' | 'cash' | 'venmo' | 'cashapp' | 'other',
                status: (r.status as any) || 'pending',
                rosterPlayerId: undefined,
                createdAt: r.createdAt || r.registrationDate || new Date().toISOString(),
                updatedAt: r.updatedAt,
              }));
              setRegistrations(mapped.slice(0, 5));
            } catch (progErr) {
              console.warn('Could not fetch program registrations:', progErr);
              setRegistrations([]);
            }
          }
        } catch (regError) {
          console.warn('Could not fetch registrations (permission denied):', regError);
          // Try program registrations as a fallback
          try {
            const progRegs = await programRegistrationsService.getAllProgramRegistrations();
            const mapped = progRegs.map((r) => ({
              id: r.id,
              teamId: r.programId || '',
              playerName: r.playerName || r.programName || 'Registrant',
              playerAge: 0,
              playerPosition: undefined,
              parentName: '',
              parentEmail: '',
              phoneNumber: '',
              fee: r.totalAmount || 0,
              paymentMethod: (r.paymentMethod || 'other') as 'stripe' | 'paypal' | 'square' | 'check' | 'cash' | 'venmo' | 'cashapp' | 'other',
              status: (r.status as any) || 'pending',
              rosterPlayerId: undefined,
              createdAt: r.createdAt || r.registrationDate || new Date().toISOString(),
              updatedAt: r.updatedAt,
            }));
            setRegistrations(mapped.slice(0, 5));
          } catch (progErr) {
            console.warn('Could not fetch program registrations after fallback:', progErr);
            setRegistrations([]);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [dispatch]);

  // Calculate metrics when data changes
  useEffect(() => {
    const totalBudget = teams.reduce((sum, t) => sum + (t.budget || 0), 0);
    const totalSpent = teams.reduce((sum, t) => sum + (t.spent || 0), 0);
    const activeTeams = teams.filter(t => t.status === SeasonStatusValues.active).length;
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const activePrograms = programs.filter(p => p.active).length;
    const totalRegistrants = programs.reduce((sum, p) => sum + (p.currentRegistrants || 0), 0);
    const moneyCollected = programs.reduce((sum, p) => sum + (p.totalPayments || 0), 0);

    setMetrics(prev => ({
      ...prev,
      totalTeams: teams.length,
      activeTeams,
      totalBudget,
      totalSpent,
      budgetUtilization,
      activePrograms,
      totalRegistrants,
      moneyCollected,
    }));
  }, [teams, programs]);

  // Load website views for selected range
  useEffect(() => {
    const loadViews = async () => {
      try {
        const { timeseries } = await fetchWebsiteTrends(websiteViewsRange);
        const totalViews = timeseries?.reduce((sum, d) => sum + d.views, 0) || 0;
        setMetrics(prev => ({ ...prev, websiteViews: totalViews }));
      } catch (error) {
        // Silently fail - metrics will show 0
        console.error('Website views fetch failed:', error);
      }
    };
    // Temporarily disabled until Firebase Cloud Functions deployed on Blaze plan
    // To enable: Upgrade to Blaze plan, deploy functions, then uncomment line below
    loadViews();
  }, [websiteViewsRange]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // KPI Card Component
  const KPICard = ({
    title,
    value,
    icon,
    trend,
    trendValue,
    format = 'number',
    onClick,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    trend?: 'up' | 'down';
    trendValue?: number;
    format?: 'number' | 'currency' | 'percent';
    onClick?: () => void;
  }) => {
    const formattedValue =
      format === 'currency' ? formatCurrency(value) : format === 'percent' ? `${value}%` : value.toLocaleString();

    return (
      <Card className="kpi-card" hoverable onClick={onClick}>
        <Space orientation="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              {title}
            </Text>
            <div style={{ fontSize: '24px', color: '#1890ff' }}>{icon}</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: isDarkMode ? '#ffffff' : 'rgba(0, 0, 0, 0.85)' }}>
              {formattedValue}
            </div>
            {trend && trendValue !== undefined && (
              <Space size={4} style={{ marginTop: '8px' }}>
                {trend === 'up' ? (
                  <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                ) : (
                  <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                )}
                <Text
                  type={trend === 'up' ? 'success' : 'danger'}
                  style={{ fontSize: '12px', fontWeight: 500 }}
                >
                  {trendValue}% from last month
                </Text>
              </Space>
            )}
          </div>
        </Space>
      </Card>
    );
  };

  // Date range hotspot component (inline)
  const DateRangeHotspot = (props: { websiteViewsRange: number; customRange: { from?: string; to?: string } | null; onSelectPreset: (d: number) => void; onApplyCustom: (fromIso: string, toIso: string) => void; }) => {
    const { websiteViewsRange, customRange, onSelectPreset, onApplyCustom } = props;
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [rangeDates, setRangeDates] = useState<[any, any] | null>(null);

    const presets = [7, 30, 90, 180, 365];
    const isCustomActive = Boolean(customRange && customRange.from && customRange.to);

    const label = isCustomActive && customRange && customRange.from && customRange.to
      ? `${new Date(customRange.from).toLocaleDateString()} → ${new Date(customRange.to).toLocaleDateString()}`
      : `${websiteViewsRange}d`;

    return (
      <>
        <Popover
          content={
            <div style={{ padding: 8, minWidth: 260 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {presets.map(p => {
                  const isActive = !isCustomActive && websiteViewsRange === p;
                  return (
                    <Button key={p} size="small" type={isActive ? 'primary' : 'default'} onClick={() => { onSelectPreset(p); setPopoverOpen(false); }}>
                      {p === 365 ? '1y' : p === 180 ? '6m' : `${p}d`}
                    </Button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button size="small" type={isCustomActive ? 'primary' : 'default'} onClick={() => {
                  // Prefill modal with either existing customRange or derived dates from current preset
                  if (customRange && customRange.from && customRange.to) {
                    setRangeDates([dayjs(customRange.from), dayjs(customRange.to)]);
                  } else if (websiteViewsRange && websiteViewsRange > 0) {
                    // Match preset behavior: show last N days inclusive (start = today - (N-1))
                    const startOffset = Math.max(websiteViewsRange - 1, 0);
                    setRangeDates([dayjs().subtract(startOffset, 'day'), dayjs()]);
                  } else {
                    setRangeDates([dayjs().subtract(29, 'day'), dayjs()]);
                  }
                  setModalOpen(true);
                  setPopoverOpen(false);
                }}>Custom Range</Button>
                <Text type="secondary" style={{ fontSize: 12 }}>or pick a preset</Text>
              </div>
            </div>
          }
          title="Select Date Range"
          trigger="click"
          open={popoverOpen}
          onOpenChange={(open) => setPopoverOpen(open)}
        >
          <Button type="link" onClick={() => setPopoverOpen(true)} style={{ padding: '4px 8px' }}>
            Showing: <strong style={{ marginLeft: 6 }}>{label}</strong>
          </Button>
        </Popover>

        <Modal title="Select Custom Range" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => {
          if (rangeDates && rangeDates[0] && rangeDates[1]) {
            const fromIso = rangeDates[0].toISOString();
            const toIso = rangeDates[1].toISOString();
            onApplyCustom(fromIso, toIso);
          }
          setModalOpen(false);
        }}>
          <DatePicker.RangePicker
            value={rangeDates as any}
            onChange={(vals: any) => setRangeDates(vals)}
            allowClear
            style={{ width: '100%' }}
          />
        </Modal>
      </>
    );
  };

  // Budget health status
  const getBudgetStatus = (utilization: number) => {
    if (utilization < 50) return { color: '#52c41a', status: 'Healthy' };
    if (utilization < 80) return { color: '#faad14', status: 'Caution' };
    return { color: '#ff4d4f', status: 'Critical' };
  };

  const budgetStatus = getBudgetStatus(metrics.budgetUtilization);

  // Team breakdown table columns
  const teamColumns = [
    {
      title: 'Team Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === SeasonStatusValues.active ? 'green' : 'default'}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number) => <Text>{formatCurrency(budget || 0)}</Text>,
      align: 'right' as const,
    },
    {
      title: 'Spent',
      dataIndex: 'spent',
      key: 'spent',
      render: (spent: number) => <Text type="danger">{formatCurrency(spent || 0)}</Text>,
      align: 'right' as const,
    },
    {
      title: 'Remaining',
      key: 'remaining',
      render: (_: any, record: any) => {
        const remaining = (record.budget || 0) - (record.spent || 0);
        return <Text type={remaining >= 0 ? 'success' : 'danger'}>{formatCurrency(remaining)}</Text>;
      },
      align: 'right' as const,
    },
  ];

  return (
    <div
      className="dashboard-page"
      style={{ backgroundColor: isDarkMode ? '#141414' : '#fafafa', color: isDarkMode ? '#ffffff' : 'rgba(0, 0, 0, 0.85)' }}
    >
      {/* Header */}
      <Space className="dashboard-header" orientation="vertical" size={8}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Dashboard
            </Title>
            <Text type="secondary">Welcome back, {user?.displayName || 'Admin'}! Here's your organization overview.</Text>
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <DateRangeHotspot
            websiteViewsRange={websiteViewsRange}
            customRange={customRange}
            onApplyCustom={(fromIso, toIso) => dispatch({ type: 'ui/setWebsiteCustomRange', payload: { from: fromIso, to: toIso } })}
            onSelectPreset={(d) => dispatch({ type: 'ui/setWebsiteViewsRange', payload: d })}
          />
        </div>
      </Space>

      {/* KPI Cards */}
      <Spin spinning={dataLoading}>
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title={`Website Page Views (${websiteViewsRange}d)`}
              value={metrics.websiteViews}
              icon={<EyeOutlined />}
              onClick={() => navigate('/admin/analytics')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="Total Registrants"
              value={metrics.totalRegistrants}
              icon={<UserOutlined />}
              onClick={() => navigate('/admin/registrations')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="Money Collected"
              value={metrics.moneyCollected}
              icon={<DollarOutlined />}
              format="currency"
              onClick={() => navigate('/admin/payments')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="Active Programs"
              value={metrics.activePrograms}
              icon={<AppstoreOutlined />}
              onClick={() => navigate('/admin/programs')}
            />
          </Col>
        </Row>

        {/* Second Row of KPI Cards */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="Active Teams"
              value={metrics.activeTeams}
              icon={<TeamOutlined />}
              onClick={() => navigate('/admin/teams')}            />
          </Col>
        </Row>

        {/* Finance & Teams Overview */}
        <Row gutter={[24, 24]}>
          {/* Budget Overview Card */}
          <Col xs={24} lg={12}>
            <Card title="Budget Overview" hoverable style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}>
              <Space orientation="vertical" style={{ width: '100%' }} size={24}>
                <Row gutter={[16, 16]}>
                  <Col xs={12}>
                    <Statistic
                      title="Total Budget"
                      value={metrics.totalBudget}
                      prefix="$"
                      precision={0}
                      styles={{ content: { color: isDarkMode ? '#ffffff' : '#1890ff' } }}
                    />
                  </Col>
                  <Col xs={12}>
                    <Statistic
                      title="Total Spent"
                      value={metrics.totalSpent}
                      prefix="$"
                      precision={0}
                      styles={{ content: { color: isDarkMode ? '#ffffff' : '#ff4d4f' } }}
                    />
                  </Col>
                </Row>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: isDarkMode ? '#262626' : '#f5f5f5',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space orientation="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Budget Utilization
                    </Text>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: budgetStatus.color }}>
                      {metrics.budgetUtilization}%
                    </div>
                    <Tag
                      style={{
                        marginTop: '8px',
                        backgroundColor: isDarkMode ? `${budgetStatus.color}20` : undefined,
                        color: budgetStatus.color,
                        borderColor: budgetStatus.color
                      }}
                    >
                      {budgetStatus.status}
                    </Tag>
                  </Space>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: `${budgetStatus.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                    }}
                  >
                    <BankOutlined style={{ color: budgetStatus.color }} />
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Quick Stats Card */}
          <Col xs={24} lg={12}>
            <Card title="Organization Stats" hoverable style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}>
              <Space orientation="vertical" style={{ width: '100%' }} size={16}>
                <Row>
                  <Col span={12}>
                    <Text type="secondary">Total Teams</Text>
                    <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: isDarkMode ? '#ffffff' : 'rgba(0, 0, 0, 0.85)' }}>
                      {metrics.totalTeams}
                    </div>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Tooltip title="Teams with active status">
                      <Text type="secondary">Active Teams</Text>
                    </Tooltip>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        marginTop: '4px',
                        color: metrics.activeTeams > 0 ? '#52c41a' : '#d9d9d9',
                      }}
                    >
                      {metrics.activeTeams}
                    </div>
                  </Col>
                </Row>
                <div style={{ height: '1px', backgroundColor: isDarkMode ? '#434343' : '#f0f0f0' }} />
                <Row>
                  <Col span={12}>
                    <Statistic
                      title="Avg Budget/Team"
                      value={metrics.totalTeams > 0 ? metrics.totalBudget / metrics.totalTeams : 0}
                      prefix="$"
                      precision={0}
                    />
                  </Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Statistic
                      title="Remaining Budget"
                      value={metrics.totalBudget - metrics.totalSpent}
                      prefix="$"
                      precision={0}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Announcements and Registrants Tables */}
        <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
          {/* Announcements Table */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <BellOutlined style={{ fontSize: '20px' }} />
                  <span>Recent Announcements</span>
                </Space>
              }
              extra={
                <Link to="/admin/announcements">
                  <Button type="link" size="small">See All</Button>
                </Link>
              }
              hoverable
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              {announcements.length > 0 ? (
                <Table
                  columns={[
                    {
                      title: 'Title',
                      dataIndex: 'title',
                      key: 'title',
                      render: (title: string, record: Announcement) => (
                        <AntLink href={`#/announcements/${record.id}`} ellipsis>
                          {title}
                        </AntLink>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'published' ? 'green' : 'orange'}>
                          {status.toUpperCase()}
                        </Tag>
                      ),
                      width: 100,
                    },
                    {
                      title: 'Views',
                      dataIndex: 'views',
                      key: 'views',
                      align: 'center' as const,
                      width: 80,
                    },
                  ]}
                  dataSource={announcements.map(a => ({ ...a, key: a.id }))}
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty description="No announcements yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>

          {/* Recent Registrants Table */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <UsergroupAddOutlined style={{ fontSize: '20px' }} />
                  <span>Recent Registrations</span>
                </Space>
              }
              extra={
                <Link to="/admin/registrations">
                  <Button type="link" size="small">See All</Button>
                </Link>
              }
              hoverable
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              {registrations.length > 0 ? (
                <Table
                  columns={[
                    {
                      title: 'Player',
                      dataIndex: 'playerName',
                      key: 'playerName',
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'paid' ? 'green' : status === 'approved' ? 'blue' : 'orange'}>
                          {status.toUpperCase()}
                        </Tag>
                      ),
                      width: 90,
                    },
                    {
                      title: 'Fee',
                      dataIndex: 'fee',
                      key: 'fee',
                      render: (fee: number) => formatCurrency(fee),
                      align: 'right' as const,
                      width: 100,
                    },
                  ]}
                  dataSource={registrations.map((r, idx) => ({ ...r, key: r.id || idx }))}
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty description="No registrations yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>

        {/* Teams Table */}
        <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
          <Col span={24}>
            <Card
              title="Teams Breakdown"
              extra={
                <Button type="primary" onClick={() => navigate('/admin/teams')}>
                  Manage Teams
                </Button>
              }
              hoverable
            >
              {teams.length > 0 ? (
                <Table
                  columns={teamColumns}
                  dataSource={teams.map(t => ({ ...t, key: t.id }))}
                  pagination={{ pageSize: 10 }}
                  size="middle"
                />
              ) : (
                <Empty description="No teams yet" style={{ marginTop: '24px' }} />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
