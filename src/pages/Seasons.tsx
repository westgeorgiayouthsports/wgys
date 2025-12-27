import { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '../services/firebase';
import { useSelector } from 'react-redux';
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Tooltip,
  Tabs,
  Row,
  Col,
  DatePicker,
  Segmented,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import type { RootState } from '../store/store';
import { seasonsService } from '../services/firebaseSeasons';
import { programsService } from '../services/firebasePrograms';
import type { Season, SeasonFormData } from '../types/season';
import dayjs from 'dayjs';
// DatePicker imported above from 'antd'
import type { Dayjs } from 'dayjs';
import { SeasonStatusValues } from '../types/enums/season';

const { Title, Text } = Typography;
  const seasonColor: Record<Season['seasonType'], string> = {
  spring: 'blue',
  summer: 'green',
  fall: 'orange',
  winter: 'geekblue',
};

const seasonLabel: Record<Season['seasonType'], string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

export default function Seasons() {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(SeasonStatusValues.active);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15 });
  const [programCountBySeason, setProgramCountBySeason] = useState<Record<string, number>>({});
  const [form] = Form.useForm();

  if (role !== 'admin' && role !== 'owner') {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Title level={2} type="danger">Access Denied</Title>
        <Text type="secondary">You need admin or owner privileges to access this page.</Text>
      </div>
    );
  }

  useEffect(() => {
    loadSeasons();
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    if (user?.uid) {
      try {
        const userRef = ref(db, `users/${user.uid}/preferences`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const prefs = snapshot.val();
          if (prefs.seasonsPageSize) {
            setPagination(prev => ({ ...prev, pageSize: prefs.seasonsPageSize }));
          }
        }
      } catch (error) {
        console.error('Failed to load user preferences for seasons:', error);
      }
    }
  };

  const saveUserPreferences = async (pageSize: number) => {
    if (user?.uid) {
      try {
        const userRef = ref(db, `users/${user.uid}/preferences`);
        await update(userRef, { seasonsPageSize: pageSize });
      } catch (error) {
        console.error('Failed to save seasons pageSize preference:', error);
      }
    }
  };

  const loadSeasons = async () => {
    setLoading(true);
    try {
      const seasonsList = await seasonsService.getSeasons();
      const sorted = seasonsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSeasons(sorted);
      // load programs to count assignments per season
      try {
        const programs = await programsService.getPrograms();
        const counts: Record<string, number> = {};
        (programs || []).forEach((p: any) => {
          const sid = p.seasonId || (p.season && typeof p.season === 'string' ? p.season : undefined);
          if (!sid) return;
          counts[sid] = (counts[sid] || 0) + 1;
        });
        setProgramCountBySeason(counts);
      } catch (e) {
        console.error('Error loading programs for season counts', e);
        setProgramCountBySeason({});
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
      message.error('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeason = () => {
    setEditingSeason(null);
    form.resetFields();
    // Default fiscal year start to Aug 16 of current year on create
    const year = new Date().getFullYear();
    const defaultFiscalStart = dayjs(`${year}-08-16`);
    form.setFieldsValue({ status: SeasonStatusValues.active, fiscalYearStart: defaultFiscalStart, fiscalYearEnd: defaultFiscalStart.add(1, 'year') });
    setModalVisible(true);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    form.setFieldsValue({
      name: season.name,
      seasonType: season.seasonType,
      year: season.year,
      startDate: season.startDate ? dayjs(season.startDate) : undefined,
      endDate: season.endDate ? dayjs(season.endDate) : undefined,
      fiscalYearStart: season.fiscalYearStart ? dayjs(season.fiscalYearStart) : undefined,
      fiscalYearEnd: season.fiscalYearEnd ? dayjs(season.fiscalYearEnd) : undefined,
      description: season.description,
      status: season.status,
    });
    setModalVisible(true);
  };

  const handleArchiveSeason = async (seasonId: string) => {
    try {
      await seasonsService.archiveSeasonCascade(seasonId, user?.uid || undefined);
      await loadSeasons();
      message.success('Season and all related programs/teams archived');
    } catch (error) {
      console.error('Error archiving season:', error);
      message.error('Failed to archive season');
    }
  };

  const handleDeleteSeason = async (seasonId: string) => {
    try {
      await seasonsService.deleteSeason(seasonId, user?.uid || undefined);
      await loadSeasons();
      message.success('Season deleted');
    } catch (error) {
      console.error('Error deleting season:', error);
      message.error('Failed to delete season');
    }
  };



  const handleStartDateChange = (date: Dayjs | null) => {
    if (!date) return;
    const startStr = date.format('YYYY-MM-DD');
    const meta = seasonsService.deriveSeasonMeta(startStr);
    const currentEnd = form.getFieldValue('endDate');
    const fyStart = date;
    const fyEnd = date.add(1, 'year');
    const defaultEnd = (currentEnd || date.add(3, 'month')) as Dayjs;
    const clampedEnd = defaultEnd.isBefore(fyStart, 'day') ? fyStart : (defaultEnd.isAfter(fyEnd, 'day') ? fyEnd : defaultEnd);
    form.setFieldsValue({
      startDate: date,
      seasonType: meta.type,
      year: meta.year,
      fiscalYearStart: fyStart,
      fiscalYearEnd: fyEnd,
      endDate: clampedEnd,
    });
    // clear any prior validation error on startDate now that user set it
    form.setFields([{ name: 'startDate', errors: [] }]);
  };

  const disabledWithinFiscal = (current: Dayjs | null) => {
    if (!current) return false;
    const fyStart = form.getFieldValue('fiscalYearStart') as Dayjs | undefined;
    const fyEnd = form.getFieldValue('fiscalYearEnd') as Dayjs | undefined;
    if (!fyStart || !fyEnd) return false;
    return current.isBefore(fyStart, 'day') || current.isAfter(fyEnd, 'day');
  };

  const handleFiscalYearStartChange = (date: Dayjs | null) => {
    if (!date) return;
    const fyStart = date;
    const fyEnd = date.add(1, 'year');
    const currentStart = form.getFieldValue('startDate') as Dayjs | undefined;
    const currentEnd = form.getFieldValue('endDate') as Dayjs | undefined;
    // Do NOT overwrite the existing season start or end dates; leave them as-is.
    form.setFieldsValue({ fiscalYearStart: fyStart, fiscalYearEnd: fyEnd });
    if (currentStart) {
      if (currentStart.isBefore(fyStart, 'day') || currentStart.isAfter(fyEnd, 'day')) {
        form.setFields([{ name: 'startDate', errors: ['Start date is outside fiscal year range'] }]);
      } else {
        form.setFields([{ name: 'startDate', errors: [] }]);
      }
    }
    if (currentEnd) {
      if (currentEnd.isBefore(fyStart, 'day') || currentEnd.isAfter(fyEnd, 'day')) {
        form.setFields([{ name: 'endDate', errors: ['End date is outside fiscal year range'] }]);
      } else {
        form.setFields([{ name: 'endDate', errors: [] }]);
      }
    }
  };

  const handleEndDateChange = (date: Dayjs | null) => {
    if (!date) {
      form.setFieldsValue({ endDate: null });
      return;
    }
    const fyStart = form.getFieldValue('fiscalYearStart') as Dayjs | undefined;
    const fyEnd = form.getFieldValue('fiscalYearEnd') as Dayjs | undefined;
    let clamped = date;
    if (fyStart && fyEnd) {
      if (date.isBefore(fyStart, 'day')) clamped = fyStart;
      if (date.isAfter(fyEnd, 'day')) clamped = fyEnd;
    }
    form.setFieldsValue({ endDate: clamped });
  };

  const handleSubmit = async (values: any) => {
    try {
      // normalize date fields to YYYY-MM-DD strings
      const startDate = values.startDate ? (values.startDate as Dayjs).format('YYYY-MM-DD') : undefined;
      const endDate = values.endDate ? (values.endDate as Dayjs).format('YYYY-MM-DD') : undefined;
      const fiscalYearStart = values.fiscalYearStart ? (values.fiscalYearStart as Dayjs).format('YYYY-MM-DD') : undefined;
      const fiscalYearEnd = values.fiscalYearEnd ? (values.fiscalYearEnd as Dayjs).format('YYYY-MM-DD') : undefined;

      const formData: SeasonFormData = {
        name: values.name,
        seasonType: values.seasonType,
        year: values.year,
        startDate,
        endDate,
        fiscalYearStart,
        fiscalYearEnd,
        description: values.description,
        status: values.status || SeasonStatusValues.draft,
      } as any;

      // derive type/year from startDate if present
      if (startDate && (!formData.seasonType || !formData.year)) {
        const meta = seasonsService.deriveSeasonMeta(startDate);
        formData.seasonType = meta.type as any;
        formData.year = meta.year;
      }

      if (editingSeason) {
        await seasonsService.updateSeason(editingSeason.id, {
          ...formData,
        }, user?.uid || undefined);
        message.success('Season updated successfully');
      } else {
        await seasonsService.createSeason(formData, user?.uid || '');
        message.success('Season created successfully');
      }

      await loadSeasons();
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error saving season:', error);
      message.error('Failed to save season');
    }
  };


  const columns = [
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (record: Season) => (
        <Tag color={record.status === SeasonStatusValues.active ? 'green' : record.status === SeasonStatusValues.archived ? 'red' : 'default'}>
          {record.status === SeasonStatusValues.active ? 'Active' : record.status === SeasonStatusValues.archived ? 'Archived' : 'Draft'}
        </Tag>
      ),
    },
    {
      title: 'Season Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Type',
      key: 'seasonType',
      width: 75,
      render: (record: Season) => (
        <Tag color={seasonColor[record.seasonType]}>
          {seasonLabel[record.seasonType]}
        </Tag>
      ),
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
      width: 50,
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 140,
      render: (val: string) => val ? dayjs(val).format('MMM D, YYYY') : '-',
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 140,
      render: (val: string) => val ? dayjs(val).format('MMM D, YYYY') : '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Created',
      key: 'createdAt',
      width: 150,
      render: (record: Season) => dayjs(record.createdAt).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (record: Season) => {
        const programsCount = programCountBySeason[record.id] || 0;
        const canDelete = programsCount === 0;
        const showArchive = record.status !== SeasonStatusValues.active && record.status !== SeasonStatusValues.archived;
        return (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditSeason(record)}
              disabled={record.status === SeasonStatusValues.archived}
            >
              Edit
            </Button>
            {showArchive && (
              <Popconfirm
                title="Archive Season"
                description="This will archive all programs and teams in this season. Continue?"
                onConfirm={() => handleArchiveSeason(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button size="small" icon={<LockOutlined />}>Archive</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="Delete Season"
              description={canDelete ? 'Are you sure you want to delete this season?' : 'Cannot delete season with programs assigned'}
              onConfirm={() => canDelete ? handleDeleteSeason(record.id) : undefined}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title={canDelete ? 'Delete season' : 'Season has programs; cannot delete'}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={!canDelete} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Seasons</Title>
            <Text type="secondary">Manage program seasons</Text>
          </div>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSeason}>
              New Season
            </Button>
          </Space>
        </Space>
      </div>

      <Card title="Season Directory">
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start' }}>
          {(() => {
            const items = [
              { key: 'active', label: 'Active' },
              { key: 'draft', label: 'Draft' },
              { key: 'closed', label: 'Closed' },
              { key: 'archived', label: 'Archived' },
              { key: 'all', label: 'All' },
            ];
            return <Tabs activeKey={statusFilter} onChange={(k) => setStatusFilter(k)} items={items} />;
          })()}
        </div>
        <Table
          columns={columns}
          dataSource={seasons.filter(s => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'active') return s.status === SeasonStatusValues.active;
            if (statusFilter === 'archived') return s.status === SeasonStatusValues.archived;
            if (statusFilter === 'closed') return s.status === SeasonStatusValues.closed;
            if (statusFilter === 'draft') return s.status === SeasonStatusValues.draft;
            return true;
          })}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} seasons`,
            onChange: (page, size) => {
              setPagination({ current: page, pageSize: size || 15 });
              if (size && size !== pagination.pageSize) saveUserPreferences(size || 15);
            }
          }}
          loading={loading}
          size="middle"
        />
      </Card>

      <Modal
        title={editingSeason ? 'Edit Season' : 'Create New Season'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Season Name" rules={[{ required: true, message: 'Please enter season name' }]}>
            <Input placeholder="e.g., Spring 2026" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true, message: 'Please select start date' }]}>
                <DatePicker allowClear={false} style={{ width: '100%' }} format="YYYY-MM-DD" onChange={handleStartDateChange} disabledDate={disabledWithinFiscal} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="endDate" label="End Date">
                <DatePicker allowClear={false} style={{ width: '100%' }} format="YYYY-MM-DD" onChange={handleEndDateChange} disabledDate={disabledWithinFiscal} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fiscalYearStart" label="Fiscal Year Start">
                <DatePicker allowClear={false} style={{ width: '100%' }} format="YYYY-MM-DD" onChange={handleFiscalYearStartChange} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="fiscalYearEnd" label="Fiscal Year End" tooltip="Derived from fiscal year start">
                <DatePicker allowClear={false} style={{ width: '100%' }} format="YYYY-MM-DD" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="seasonType" label="Season Type" tooltip="Derived from start date">
                <Select placeholder="(Derived from start date)" disabled>
                  <Select.Option value="spring">Spring</Select.Option>
                  <Select.Option value="summer">Summer</Select.Option>
                  <Select.Option value="fall">Fall</Select.Option>
                  <Select.Option value="winter">Winter</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="year" label="Year" tooltip="Derived from start date">
                <InputNumber min={2020} max={2099} style={{ width: '100%' }} placeholder="(Derived from start date)" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Season details" />
          </Form.Item>

          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Segmented
              options={Object.entries(SeasonStatusValues).map(([key, val]) => ({
                label: key.charAt(0).toUpperCase() + key.slice(1),
                value: val,
              }))}
            />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}
