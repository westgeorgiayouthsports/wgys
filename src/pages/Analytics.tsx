import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Button, Space, Tag, Typography, Segmented } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { fetchWebsiteMetrics, fetchWebsiteTrends } from '../services/analyticsClient';
import { getEnv } from '../utils/env';
import type { ViewsSource } from '../types';
import logger from '../utils/logger';

const { Title, Text } = Typography;

export default function Analytics() {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const websiteViewsRange = useSelector((state: RootState) => state.ui?.websiteViewsRange || 30);

  const [websiteViews, setWebsiteViews] = useState(0);
  const [realtimeViews, setRealtimeViews] = useState<number | undefined>(undefined);
  const [source, setSource] = useState<string | undefined>(undefined);
  const [metricsHealthy, setMetricsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendRange, setTrendRange] = useState<number>(websiteViewsRange);
  const [trendData, setTrendData] = useState<Array<{ date: string; views: number; source?: ViewsSource }>>([]);
  const [trendSource, setTrendSource] = useState<ViewsSource | undefined>(undefined);
  const [chartMode, setChartMode] = useState<'line' | 'bar'>('line');
  const mpFallbackEnabled = Boolean(import.meta.env.VITE_GA4_API_SECRET || getEnv('VITE_GA4_API_SECRET'));

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const { views, healthy, realtimeViews, source } = await fetchWebsiteMetrics();
        const numericViews = typeof views === 'number' ? views : Number(views || 0);
        const numericRealtime = typeof realtimeViews === 'number' ? realtimeViews : Number(realtimeViews || 0);
        const initialViews = numericViews === 0 && numericRealtime > 0 ? numericRealtime : numericViews;
        setWebsiteViews(initialViews);
        setRealtimeViews(numericRealtime);
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

  // Keep local trendRange in sync with global UI state
  useEffect(() => {
    if (websiteViewsRange !== trendRange) {
      setTrendRange(websiteViewsRange);
      loadTrends(websiteViewsRange);
    }

  }, [websiteViewsRange]);

  useEffect(() => {
    const loadRangedMetrics = async () => {
      try {
        const { timeseries } = await fetchWebsiteTrends(trendRange);
        if (timeseries && timeseries.length) {
          const totalViews = timeseries.reduce((sum, d) => sum + d.views, 0);
          setWebsiteViews(totalViews);
        } else {
          // If the trends endpoint doesn't return a timeseries (some backends
          // return only realtime `views`), fall back to the metrics endpoint
          // and prefer realtime when the top-level views is 0.
          const { views, realtimeViews } = await fetchWebsiteMetrics();
          const numericViews = typeof views === 'number' ? views : Number(views || 0);
          const numericRealtime = typeof realtimeViews === 'number' ? realtimeViews : Number(realtimeViews || 0);
          const fallback = numericViews === 0 && numericRealtime > 0 ? numericRealtime : numericViews;
          setWebsiteViews(fallback);
        }
      } catch (err) {
        console.error('Failed to load ranged metrics', err);
      }
    };
    loadRangedMetrics();
  }, [trendRange]);

  const loadTrends = async (days: number) => {
    setTrendLoading(true);
    try {
      const { timeseries, source, views: topViews, realtimeViews: topRealtime } = await fetchWebsiteTrends(days as number) as any;

      // Generate full date range. For 1d, generate hourly buckets for yesterday (00:00-23:00).
      const fullDateRange: Array<{ date: string; views: number; source?: ViewsSource; label?: string }> = [];
      const today = new Date();
      const dataMap = new Map((timeseries || []).map((item: { date: any; views: any; }) => [item.date, item.views]));

      if (days === 1) {
        // Build last 24 hourly buckets ending at the previous hour from now.
        const now = new Date();
        const end = new Date(now);
        end.setMinutes(0, 0, 0);
        end.setHours(end.getHours() - 1); // previous hour
        // start is 23 hours before end
        const start = new Date(end);
        start.setHours(end.getHours() - 23);
        for (let k = 0; k < 24; k++) {
          const dt = new Date(start);
          dt.setHours(start.getHours() + k);
          const YYYY = dt.getFullYear();
          const MM = String(dt.getMonth() + 1).padStart(2, '0');
          const DD = String(dt.getDate()).padStart(2, '0');
          const HH = String(dt.getHours()).padStart(2, '0');
          const dateKey = `${YYYY}${MM}${DD}${HH}`; // YYYYMMDDHH
          const views = Number(dataMap.get(dateKey) || 0);
          // Build a localized hourly label from the bucket datetime
          const bucketDate = new Date(Number(YYYY), Number(MM) - 1, Number(DD), Number(HH));
          const label = bucketDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          fullDateRange.push({ date: dateKey, views, source, label });
        }
      } else {
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
          const views = Number(dataMap.get(dateStr) || 0);
          fullDateRange.push({ date: dateStr, views, source });
        }
      }

      setTrendData(fullDateRange);
      setTrendSource(source);
      // Compute the timeseries total. If the timeseries contains meaningful
      // activity (total > 0) use it. If it's all zeros but the backend
      // provides a realtime count, prefer that realtime value so the UI
      // surfaces active users instead of 0. Otherwise fall back to top-level
      // views if provided.
      const total = fullDateRange.reduce((s, it) => s + (it.views || 0), 0);
      const numericTopViews = typeof topViews === 'number' ? topViews : Number(topViews || 0);
      const numericTopRealtime = typeof topRealtime === 'number' ? topRealtime : Number(topRealtime || 0);
      if (total > 0) {
        setWebsiteViews(total);
      } else if (numericTopRealtime > 0) {
        // Prefer realtime when the timeseries is empty/zero.
        setWebsiteViews(numericTopRealtime);
      } else if (typeof topViews === 'number') {
        const fallbackTop = numericTopViews === 0 && numericTopRealtime > 0 ? numericTopRealtime : numericTopViews;
        setWebsiteViews(fallbackTop);
      }
      if (typeof topRealtime === 'number') {
        setRealtimeViews(topRealtime);
      }
    } catch (err) {
      console.error('Failed to load trends', err);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const trendRanges = [1, 7, 30, 90, 180, 365];

  const formattedTrendData = trendData.map((item) => {
    const d = item.date;
    // If the item already provided a label (hourly buckets), preserve it.
    if ((item as any).label) return { ...item } as typeof item & { label: string };
    if (d && d.length === 8) {
      const year = d.slice(0, 4);
      const month = d.slice(4, 6);
      const day = d.slice(6, 8);
      return { ...item, label: `${month}/${day}/${year}` };
    }
    // Hourly key expected as YYYYMMDDHH (length 10)
    if (d && d.length === 10) {
      const year = Number(d.slice(0, 4));
      const month = Number(d.slice(4, 6));
      const day = Number(d.slice(6, 8));
      const hour = Number(d.slice(8, 10));
      const dt = new Date(year, month - 1, day, hour);
      const label = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { ...item, label };
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
    if (formattedTrendData.length < 2) return { change: null as number | null, pct: null as string | null };
    const totalViews = formattedTrendData.reduce((s, it) => s + (it.views || 0), 0);
    // If there's no activity across the range, treat as no-data
    if (totalViews === 0) return { change: null as number | null, pct: null as string | null };
    // Use averaged endpoints (up to 3 points) to avoid extreme swings from
    // single-day spikes. This compares the average of the first N points to
    // the average of the last N points where N = min(3, length).
    const n = Math.min(3, formattedTrendData.length);
    const firstSlice = formattedTrendData.slice(0, n);
    const lastSlice = formattedTrendData.slice(formattedTrendData.length - n);
    const firstAvg = firstSlice.reduce((s, it) => s + (it.views || 0), 0) / n;
    const lastAvg = lastSlice.reduce((s, it) => s + (it.views || 0), 0) / n;
    if (firstAvg === 0 && lastAvg === 0) return { change: null as number | null, pct: null as string | null };
    const change = Math.round(lastAvg - firstAvg);
    const pct = firstAvg === 0 ? (lastAvg > 0 ? 100 : 0) : (change / firstAvg) * 100;
    const pctRounded = Math.round(pct);
    const pctStr = (pctRounded > 0 ? `+${pctRounded}` : `${pctRounded}`) + '%';
    return { change, pct: pctStr };
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
                    {getEnv('VITE_FIREBASE_GA4_PROPERTY_ID') || '514640984'}
                  </Text>
                <div
                  role="status"
                  aria-live="polite"
                  className={`showing-tag ${trendRange === 1 ? 'showing-pulse' : ''}`}
                >
                  Range: {trendRange}d
                </div>
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
                try {
                  dispatch({ type: 'ui/setWebsiteViewsRange', payload: days });
                } catch (e) {
                  logger.error('Failed to set website views range in global state', e);
                }
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
                    value={trendDelta.change ?? '—'}
                    suffix={trendDelta.pct ?? ''}
                    styles={{ content: { color: trendDelta.change == null ? undefined : (trendDelta.change >= 0 ? '#52c41a' : '#f5222d') } }}
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
