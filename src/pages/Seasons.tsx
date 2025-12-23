import { useState, useEffect } from 'react';
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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import type { RootState } from '../store/store';
import { seasonsService } from '../services/firebaseSeasons';
import type { Season, SeasonFormData } from '../types/season';
import dayjs from 'dayjs';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
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
  }, []);

  const loadSeasons = async () => {
    setLoading(true);
    try {
      const seasonsList = await seasonsService.getSeasons();
      setSeasons(seasonsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
    form.setFieldsValue({ year: new Date().getFullYear() });
    setModalVisible(true);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    form.setFieldsValue({
      name: season.name,
      seasonType: season.seasonType,
      year: season.year,
      description: season.description,
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

  const handleSubmit = async (values: any) => {
    try {
      const formData: SeasonFormData = {
        name: values.name,
        seasonType: values.seasonType,
        year: values.year,
        description: values.description,
      };

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
        <Tag color={record.status === 'active' ? 'green' : 'red'}>
          {record.status === 'active' ? 'Active' : 'Archived'}
        </Tag>
      ),
    },
    {
      title: 'Season Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Type',
      key: 'seasonType',
      width: 100,
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
      width: 100,
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
      render: (record: Season) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditSeason(record)}
            disabled={record.status === 'archived'}
          >
            Edit
          </Button>
          {record.status === 'active' && (
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
            description="Are you sure you want to delete this season?"
            onConfirm={() => handleDeleteSeason(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete season">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
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
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: 160 }}
              options={[
                { label: 'All Seasons', value: 'all' },
                { label: 'Active Only', value: 'active' },
                { label: 'Archived Only', value: 'archived' },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSeason}>
              New Season
            </Button>
          </Space>
        </Space>
      </div>

      <Card title="Season Directory">
        <Table
          columns={columns}
          dataSource={seasons.filter(s => statusFilter === 'all' ? true : s.status === statusFilter)}
          rowKey="id"
          pagination={{ pageSize: 10 }}
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

          <Form.Item name="seasonType" label="Season Type" rules={[{ required: true }]}>
            <Select placeholder="Select season type">
              <Select.Option value="spring">Spring</Select.Option>
              <Select.Option value="summer">Summer</Select.Option>
              <Select.Option value="fall">Fall</Select.Option>
              <Select.Option value="winter">Winter</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="year" label="Year" rules={[{ required: true }]}>
            <InputNumber min={2020} max={2099} style={{ width: '100%' }} placeholder="2026" />
          </Form.Item>

          <Form.Item name="description" label="Description (Optional)">
            <Input.TextArea rows={3} placeholder="Season details, important dates, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
