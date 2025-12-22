import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Empty, Spin, Button, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { fetchWebsiteMetrics } from '../services/analyticsClient';

const { Title, Text } = Typography;

export default function Analytics() {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  
  const [websiteViews, setWebsiteViews] = useState(0);
  const [metricsHealthy, setMetricsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const { views, healthy } = await fetchWebsiteMetrics();
        setWebsiteViews(views);
        setMetricsHealthy(healthy);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

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
        Analytics & Metrics
      </Title>
      <Text type="secondary" style={{ marginBottom: '32px', display: 'block' }}>
        Track your website performance and engagement metrics
      </Text>

      {/* Metrics Cards */}
      <Spin spinning={loading}>
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={8}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Website Views (Last 7 Days)"
                value={websiteViews}
                styles={{ content: { color: isDarkMode ? '#1890ff' : '#1890ff' } }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Page views tracked from Google Analytics 4
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Monthly Average"
                value={websiteViews > 0 ? Math.round(websiteViews / 7) : 0}
                suffix="views/day"
                styles={{ content: { color: isDarkMode ? '#52c41a' : '#52c41a' } }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Estimated daily average
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Data Status"
                value={metricsHealthy ? 'Active' : 'Pending'}
                styles={{ content: { color: metricsHealthy ? '#52c41a' : '#faad14' } }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                {websiteViews === 0 
                  ? 'GA4 Cloud Function not yet deployed'
                  : 'Analytics data is being tracked'
                }
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Details Section */}
        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Card 
              title="Analytics Details"
              hoverable
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Google Analytics 4 Property ID:</Text>
                  <Text code style={{ marginLeft: '8px' }}>514640984</Text>
                </div>
                <div>
                  <Text strong>Tracking Method:</Text>
                  <Text style={{ marginLeft: '8px' }}>
                    gtag.js with custom events
                  </Text>
                </div>
                <div>
                  <Text strong>Data Source:</Text>
                  <Text style={{ marginLeft: '8px' }}>
                    Firebase Cloud Functions (GA4 Data API)
                  </Text>
                </div>
                <div>
                  <Text strong>Setup Status:</Text>
                  <Tag color={metricsHealthy ? 'green' : 'orange'} style={{ marginLeft: '8px' }}>
                    {metricsHealthy ? 'Active' : 'Deployment Required'}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
