import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Button, Space, Tag, Typography, Segmented } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { fetchWebsiteMetrics, fetchWebsiteTrends } from '../services/analyticsClient';
import type { ViewsSource } from '../types';

const { Title, Text } = Typography;

export default function Analytics() {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  
  const [websiteViews, setWebsiteViews] = useState(0);
  const [realtimeViews, setRealtimeViews] = useState<number | undefined>(undefined);
  const [source, setSource] = useState<string | undefined>(undefined);
  const [metricsHealthy, setMetricsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendRange, setTrendRange] = useState<number>(30);
  const [trendData, setTrendData] = useState<Array<{ date: string; views: number; source?: ViewsSource }>>([]);
  const [trendSource, setTrendSource] = useState<ViewsSource | undefined>(undefined);
  const [chartMode, setChartMode] = useState<'line' | 'bar'>('line');
  const mpFallbackEnabled = Boolean(import.meta.env.VITE_GA4_API_SECRET);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const { views, healthy, realtimeViews, source } = await fetchWebsiteMetrics();
        setWebsiteViews(views);
        setRealtimeViews(realtimeViews);
        setSource(source);
        setMetricsHealthy(healthy);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
    loadTrends(trendRange);
  }, []);

  useEffect(() => {
    const loadRangedMetrics = async () => {
      try {
        const { timeseries } = await fetchWebsiteTrends(trendRange);
        const totalViews = timeseries?.reduce((sum, d) => sum + d.views, 0) || 0;
        setWebsiteViews(totalViews);
      } catch (err) {
        console.error('Failed to load ranged metrics', err);
      }
    };
    loadRangedMetrics();
  }, [trendRange]);

  const loadTrends = async (days: number) => {
    setTrendLoading(true);
    try {
      const { timeseries, source } = await fetchWebsiteTrends(days);
      
      // Generate full date range
      const fullDateRange: Array<{ date: string; views: number; source?: ViewsSource }> = [];
      const today = new Date();
      const dataMap = new Map((timeseries || []).map(item => [item.date, item.views]));
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
        const views = dataMap.get(dateStr) || 0;
        fullDateRange.push({ date: dateStr, views, source });
      }
      
      setTrendData(fullDateRange);
      setTrendSource(source);
    } catch (err) {
      console.error('Failed to load trends', err);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const trendRanges = [7, 30, 90, 180, 365];

  const formattedTrendData = trendData.map((item) => {
    const d = item.date;
    if (d && d.length === 8) {
      const year = d.slice(0, 4);
      const month = d.slice(4, 6);
      const day = d.slice(6, 8);
      return { ...item, label: `${month}/${day}/${year}` };
    }
    return { ...item, label: item.date };
  });

  const maxLinePoints = 12;
  const sampledTrendData = (() => {
    if (formattedTrendData.length <= maxLinePoints) return formattedTrendData;
    const step = Math.ceil((formattedTrendData.length - 1) / (maxLinePoints - 1));
    const sampled: typeof formattedTrendData = [];
    for (let i = 0; i < formattedTrendData.length; i += step) {
      sampled.push(formattedTrendData[i]);
    }
    // ensure last point is included
    if (sampled[sampled.length - 1]?.date !== formattedTrendData[formattedTrendData.length - 1]?.date) {
      sampled.push(formattedTrendData[formattedTrendData.length - 1]);
    }
    return sampled;
  })();

  const sparklinePath = (() => {
    if (!sampledTrendData.length) return '';
    const values = sampledTrendData.map((d) => d.views);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const width = 600;
    const height = 200;
    return sampledTrendData
      .map((point, idx) => {
        const x = (idx / Math.max(1, sampledTrendData.length - 1)) * width;
        const y = height - ((point.views - min) / range) * height;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  })();

  const barRects = (() => {
    if (!sampledTrendData.length) return [] as Array<{ x: number; y: number; height: number; width: number }>;
    const values = sampledTrendData.map((d) => d.views);
    const max = Math.max(...values, 1);
    const width = 600;
    const height = 200;
    const gap = 4;
    const barWidth = Math.max(8, width / Math.max(1, sampledTrendData.length) - gap);
    return sampledTrendData.map((point, idx) => {
      const x = idx * (barWidth + gap);
      const h = (point.views / max) * height;
      const y = height - h;
      return { x, y, height: h, width: barWidth };
    });
  })();

  const trendDelta = (() => {
    if (formattedTrendData.length < 2) return { change: 0, pct: 0 };
    const first = formattedTrendData[0].views;
    const last = formattedTrendData[formattedTrendData.length - 1].views;
    const change = last - first;
    const pct = first === 0 ? (last > 0 ? 100 : 0) : (change / first) * 100;
    return { change, pct: Math.round(pct) };
  })();

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
                title="Data Status"
                value={metricsHealthy ? 'Active' : 'Pending'}
                styles={{ content: { color: metricsHealthy ? '#52c41a' : '#faad14' } }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                {metricsHealthy
                  ? (websiteViews === 0
                      ? 'Connected: no views reported yet'
                      : 'Analytics data is being tracked')
                  : 'GA4 Cloud Function not yet deployed'}
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              hoverable 
              style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
            >
              <Statistic
                title="Realtime (Last ~30m)"
                value={typeof realtimeViews === 'number' ? realtimeViews : '—'}
                styles={{ content: { color: isDarkMode ? '#722ed1' : '#722ed1' } }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Source: {source || 'pending'}
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
                  <Text code style={{ marginLeft: '8px' }}>
                    {import.meta.env.VITE_FIREBASE_GA4_PROPERTY_ID || '514640984'}
                  </Text>
                </div>
                <div>
                  <Text strong>Tracking Method:</Text>
                  <Text style={{ marginLeft: '8px' }}>gtag.js</Text>
                </div>
                <div>
                  <Text strong>Fallback Delivery (MP):</Text>
                  <Tag color={mpFallbackEnabled ? 'green' : 'default'} style={{ marginLeft: '8px' }}>
                    {mpFallbackEnabled ? 'Enabled' : 'Disabled'}
                  </Tag>
                </div>
                <div>
                  <Text strong>Data Source:</Text>
                  <Text style={{ marginLeft: '8px' }}>
                    Firebase Cloud Functions (GA4 Data API, realtime fallback)
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

      {/* Website Views Trend with integrated cards */}
      <Card
        title={`Website Page Views (${trendRange}d)`}
        hoverable
        style={{ marginTop: 24, backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff' }}
        extra={
          <Space>
            <Segmented
              options={trendRanges.map((d) => ({ label: `${d === 365 ? '1y' : d === 180 ? '6m' : `${d}d`}`, value: d }))}
              value={trendRange}
              onChange={(val) => {
                const days = Number(val);
                setTrendRange(days);
                loadTrends(days);
              }}
            />
            <Segmented
              options={[{ label: 'Line', value: 'line' }, { label: 'Bars', value: 'bar' }]}
              value={chartMode}
              onChange={(val) => setChartMode(val as 'line' | 'bar')}
            />
          </Space>
        }
      >
        <Spin spinning={trendLoading}>
          {formattedTrendData.length ? (
            <div>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title={`Total Views (${trendRange}d)`}
                    value={websiteViews}
                    styles={{ content: { color: isDarkMode ? '#1890ff' : '#1890ff' } }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Source: {trendSource || source || 'pending'}
                  </Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title={`Daily Average (${trendRange}d)`}
                    value={websiteViews > 0 ? Math.round(websiteViews / trendRange) : 0}
                    suffix="views/day"
                    styles={{ content: { color: isDarkMode ? '#52c41a' : '#52c41a' } }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Change"
                    value={trendDelta.change}
                    suffix={`${trendDelta.pct}%`}
                    styles={{ content: { color: trendDelta.change >= 0 ? '#52c41a' : '#f5222d' } }}
                  />
                </Col>
              </Row>
                <div style={{ width: '100%', overflowX: 'auto', padding: '8px 0' }}>
                  {chartMode === 'line' ? (
                    <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet" style={{ minWidth: '600px' }}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#1890ff" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#1890ff" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      {sparklinePath ? (
                        <g>
                          <path
                            d={`${sparklinePath} L600,200 L0,200 Z`}
                            fill="url(#trendGradient)"
                            stroke="none"
                          />
                          <path
                            d={sparklinePath}
                            fill="none"
                            stroke="#1890ff"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      ) : null}
                      {/* Date labels */}
                      {sampledTrendData.map((point, idx) => {
                        const x = (idx / Math.max(1, sampledTrendData.length - 1)) * 600;
                        return (
                          <text
                            key={`label-${idx}`}
                            x={x}
                            y={220}
                            textAnchor="middle"
                            fontSize="10"
                            fill={isDarkMode ? '#888' : '#666'}
                          >
                            {point.label?.split('/').slice(0, 2).join('/')}
                          </text>
                        );
                      })}
                    </svg>
                  ) : (
                    <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet" style={{ minWidth: '600px' }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#1890ff" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#1890ff" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>
                      {barRects.map((bar, idx) => (
                        <rect
                          key={`${bar.x}-${idx}`}
                          x={bar.x}
                          y={bar.y}
                          width={bar.width}
                          height={bar.height}
                          rx={2}
                          fill="url(#barGradient)"
                        />
                      ))}
                      {/* Date labels */}
                      {sampledTrendData.map((point, idx) => {
                        const barWidth = Math.max(8, 600 / Math.max(1, sampledTrendData.length) - 4);
                        const x = idx * (barWidth + 4) + barWidth / 2;
                        return (
                          <text
                            key={`label-${idx}`}
                            x={x}
                            y={220}
                            textAnchor="middle"
                            fontSize="10"
                            fill={isDarkMode ? '#888' : '#666'}
                          >
                            {point.label?.split('/').slice(0, 2).join('/')}
                          </text>
                        );
                      })}
                    </svg>
                  )}
                </div>
            </div>
          ) : (
            <Text type="secondary">No trend data yet for this range.</Text>
          )}
        </Spin>
      </Card>
    </div>
  );
}
