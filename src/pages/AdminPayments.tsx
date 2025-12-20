import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Empty, Spin, Button, Space, Tag, Typography, Statistic, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { registrationsService, type Registration } from '../services/firebaseRegistrations';
import { programsService } from '../services/firebasePrograms';
import type { Program } from '../types/program';

const { Title, Text } = Typography;

export default function AdminPayments() {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [regsData, progsData] = await Promise.all([
          registrationsService.getAllRegistrations(),
          programsService.getPrograms(),
        ]);
        setRegistrations(regsData);
        setPrograms(progsData);
      } catch (error) {
        console.error('Failed to load payment data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const columns = [
    {
      title: 'Player Name',
      dataIndex: 'playerName',
      key: 'playerName',
    },
    {
      title: 'Parent',
      dataIndex: 'parentName',
      key: 'parentName',
    },
    {
      title: 'Amount',
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: number) => `$${fee.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'paid' ? 'green' : status === 'approved' ? 'blue' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
    },
  ];

  // Calculate metrics
  const paidRegs = registrations.filter(r => r.status === 'paid');
  const approvedRegs = registrations.filter(r => r.status === 'approved');
  const pendingRegs = registrations.filter(r => r.status === 'pending');

  const totalPaid = paidRegs.reduce((sum, r) => sum + r.fee, 0);
  const totalApproved = approvedRegs.reduce((sum, r) => sum + r.fee, 0);
  const totalPending = pendingRegs.reduce((sum, r) => sum + r.fee, 0);
  const totalRevenue = programs.reduce((sum, p) => sum + (p.totalPayments || 0), 0);

  return (
    <div
      style={{
        padding: '32px',
        backgroundColor: isDarkMode ? '#141414' : '#fafafa',
        color: isDarkMode ? '#ffffff' : 'rgba(0, 0, 0, 0.85)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <Space style={{ marginBottom: '32px' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Space>

      <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
        Payments & Revenue
      </Title>
      <Text type="secondary" style={{ marginBottom: '32px', display: 'block' }}>
        Track registrations fees and payment status
      </Text>

      {/* Summary Cards */}
      <Spin spinning={loading}>
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Total Collected"
                value={totalPaid}
                prefix="$"
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                {paidRegs.length} paid registrations
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Approved (Pending)"
                value={totalApproved}
                prefix="$"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                {approvedRegs.length} awaiting payment
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Pending Review"
                value={totalPending}
                prefix="$"
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                {pendingRegs.length} pending approval
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Total Revenue (All Time)"
                value={totalRevenue}
                prefix="$"
                precision={2}
                valueStyle={{ color: isDarkMode ? '#1890ff' : '#1890ff' }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Across all programs
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Payment Details by Status */}
        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Card 
              title="Payments by Status"
              hoverable
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Tabs
                items={[
                  {
                    key: 'paid',
                    label: `Paid (${paidRegs.length})`,
                    children: (
                      <Table
                        columns={columns}
                        dataSource={paidRegs.map((r, idx) => ({ ...r, key: r.id || idx }))}
                        pagination={{ pageSize: 15 }}
                        size="small"
                      />
                    ),
                  },
                  {
                    key: 'approved',
                    label: `Approved (${approvedRegs.length})`,
                    children: (
                      <Table
                        columns={columns}
                        dataSource={approvedRegs.map((r, idx) => ({ ...r, key: r.id || idx }))}
                        pagination={{ pageSize: 15 }}
                        size="small"
                      />
                    ),
                  },
                  {
                    key: 'pending',
                    label: `Pending (${pendingRegs.length})`,
                    children: (
                      <Table
                        columns={columns}
                        dataSource={pendingRegs.map((r, idx) => ({ ...r, key: r.id || idx }))}
                        pagination={{ pageSize: 15 }}
                        size="small"
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
