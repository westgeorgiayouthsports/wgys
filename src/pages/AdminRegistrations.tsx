import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Empty, Spin, Button, Space, Tag, Typography, Statistic } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { registrationsService, type Registration } from '../services/firebaseRegistrations';

const { Title, Text } = Typography;

export default function AdminRegistrations() {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRegistrations = async () => {
      try {
        setLoading(true);
        const data = await registrationsService.getAllRegistrations();
        setRegistrations(data);
      } catch (error) {
        console.error('Failed to load registrations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRegistrations();
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
      title: 'Email',
      dataIndex: 'parentEmail',
      key: 'parentEmail',
      render: (email: string) => (
        <a href={`mailto:${email}`}>{email}</a>
      ),
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
      title: 'Fee',
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: number) => `$${fee.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
    },
  ];

  const paidCount = registrations.filter(r => r.status === 'paid').length;
  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const totalFees = registrations.reduce((sum, r) => sum + r.fee, 0);

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
          onClick={() => navigate('/admin/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Space>

      <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
        Program Registrations
      </Title>
      <Text type="secondary" style={{ marginBottom: '32px', display: 'block' }}>
        Manage all player registrations across programs
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
                title="Total Registrations"
                value={registrations.length}
                styles={{ content: { color: isDarkMode ? '#1890ff' : '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Paid"
                value={paidCount}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Approved (Unpaid)"
                value={approvedCount}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Pending"
                value={pendingCount}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Total Revenue */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Total Fees Collected"
                value={totalFees}
                prefix="$"
                precision={2}
                styles={{ content: { color: isDarkMode ? '#52c41a' : '#52c41a', fontSize: '28px' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Registrations Table */}
        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Card 
              title="All Registrations"
              hoverable
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              {registrations.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={registrations.map((r, idx) => ({ ...r, key: r.id || idx }))}
                  pagination={{ pageSize: 25 }}
                  size="middle"
                />
              ) : (
                <Empty description="No registrations found" />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
