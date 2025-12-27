import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  DatePicker,
  InputNumber,
  Switch,
  message,
  Spin,
  Popconfirm,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import { programsService } from '../services/firebasePrograms';
import { seasonsService } from '../services/firebaseSeasons';
import type { Program } from '../types/program';
import type { Season } from '../types/season';
import { SeasonStatusValues } from '../types/enums/season';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Programs = forwardRef(function Programs(_props, ref) {
  const navigate = useNavigate();
  const { role, user } = useSelector((state: RootState) => state.auth);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkTargetSeason, setBulkTargetSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [form] = Form.useForm();
  useImperativeHandle(ref, () => ({ form }), [form]);

  if (role !== 'admin' && role !== 'owner') {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Title level={2} type="danger">Access Denied</Title>
        <Text type="secondary">You need admin or owner privileges to access this page.</Text>
      </div>
    );
  }

  useEffect(() => {
    loadPrograms();
    loadSeasons();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const programsList = await programsService.getPrograms();
      setPrograms(programsList);
    } catch (error) {
      console.error('❌ Error loading programs:', error);
      message.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const loadSeasons = async () => {
    try {
      const seasonsList = await seasonsService.getSeasons();
      setSeasons(seasonsList);
      const firstActive = seasonsList.find(s => s.status === SeasonStatusValues.active);
      if (firstActive && selectedSeasonId === 'all') {
        setSelectedSeasonId(firstActive.id);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
      // Don't show error message for initial load if no seasons exist
      setSeasons([]);
    }
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const openBulkMove = () => {
    setBulkTargetSeason(null);
    setBulkModalVisible(true);
  };

  const performBulkMove = async () => {
    if (!bulkTargetSeason || selectedRowKeys.length === 0) return;
    try {
      const season = seasons.find(s => s.id === bulkTargetSeason);
      if (!season) throw new Error('Season not found');
      // call service to bulk update
      await programsService.bulkUpdatePrograms(selectedRowKeys as string[], { seasonId: season.id, year: season.year, season: season.seasonType as any });
      // update local state
      const updated = programs.map(p => selectedRowKeys.includes(p.id) ? { ...p, seasonId: season.id, season: season.seasonType, year: season.year, updatedAt: new Date().toISOString() } : p);
      setPrograms(updated);
      setSelectedRowKeys([]);
      setBulkModalVisible(false);
      message.success('Programs moved to selected season');
    } catch (err) {
      console.error('Bulk move failed', err);
      message.error('Failed to move programs');
    }
  };

  const handleAddProgram = () => {
    setEditingProgram(null);
    form.resetFields();
    const today = dayjs();
    form.setFieldsValue({
      status: true,
      registrationStart: today,
      registrationEnd: today.add(3, 'month')
    });
    setModalVisible(true);
  };

  const handleEditProgram = (program: Program) => {
    navigate(`/admin/programs/${program.id}`);
  };

  const handleManageTeams = (program: Program) => {
    navigate(`/admin/programs/${program.id}/teams`);
  };

  const handleDuplicateProgram = (program: Program) => {
    setEditingProgram(null);
    form.setFieldsValue({
      ...program,
      name: `${program.name} (Copy)`,
      active: program.active,
      birthDateStart: program.birthDateStart ? dayjs(program.birthDateStart) : null,
      birthDateEnd: program.birthDateEnd ? dayjs(program.birthDateEnd) : null,
      registrationStart: dayjs(program.registrationStart),
      registrationEnd: dayjs(program.registrationEnd),
        // payment plan fields removed — plans are now configured at season level
    });
    setModalVisible(true);
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      await programsService.deleteProgram(programId);
      setPrograms(programs.filter(p => p.id !== programId));
      message.success('Program deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting program:', error);
      message.error('Failed to delete program');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const today = dayjs();
      const regStart = values.registrationStart || today;
      const regEnd = values.registrationEnd || regStart.add(3, 'month');

      const formData: any = {
        ...values,
        active: values.active || false,
        birthDateStart: values.birthDateStart?.format('YYYY-MM-DD'),
        birthDateEnd: values.birthDateEnd?.format('YYYY-MM-DD'),
        registrationStart: regStart.toISOString(),
        registrationEnd: regEnd.toISOString(),
      };

      if (editingProgram) {
        await programsService.updateProgram(editingProgram.id, formData);
        setPrograms(programs.map(p =>
          p.id === editingProgram.id
            ? { ...p, ...formData, updatedAt: new Date().toISOString() }
            : p
        ));
        message.success('Program updated successfully');
      } else {
        const newProgramId = await programsService.createProgram(formData, user?.uid || '');
        const newProgram: Program = {
          id: newProgramId,
          ...formData,
          currentRegistrants: 0,
          totalPayments: 0,
          questions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
        };
        setPrograms([...programs, newProgram]);
        message.success('Program created successfully');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('❌ Error saving program:', error);
      message.error('Failed to save program');
    }
  };

  const filteredPrograms = selectedSeasonId === 'all'
    ? programs
    : selectedSeasonId === 'unassigned'
      ? programs.filter(p => !p.seasonId)
      : programs.filter(p => p.seasonId === selectedSeasonId);

  const columns = [
    {
      title: 'Status',
      key: 'active',
      render: (record: Program) => (
        <Tag color={record.active ? 'green' : 'red'}>
          {record.active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Program Name',
      key: 'name',
      render: (record: Program) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Text type="secondary">{record.sport}</Text>
          {(record.birthDateStart || record.birthDateEnd) && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Birth: {record.birthDateStart ? dayjs(record.birthDateStart).format('MMM YYYY') : '—'} to {record.birthDateEnd ? dayjs(record.birthDateEnd).format('MMM YYYY') : '—'}
              </Text>
            </div>
          )}
          {((record as any).minGrade !== undefined || (record as any).maxGrade !== undefined) && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Max Grade: {record.maxGrade !== undefined ? (record.maxGrade === 0 ? 'K' : record.maxGrade) : '—'}
                {record.allowGradeExemption && <Text type="warning"> (exemptions allowed)</Text>}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Registration Start',
      dataIndex: 'registrationStart',
      key: 'registrationStart',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
    {
      title: 'Registration End',
      dataIndex: 'registrationEnd',
      key: 'registrationEnd',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
    {
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: number) => `$${(price || 0).toFixed(2)}`,
    },
    {
      title: 'Registrants',
      key: 'registrants',
      render: (record: Program) => (
        <div>
          <Text>{(record.currentRegistrants ?? 0)}</Text>
          {record.maxParticipants != null && <Text type="secondary">/{record.maxParticipants}</Text>}
        </div>
      ),
    },
    {
      title: 'Season',
      key: 'season',
      render: (record: Program) => {
        const season = seasons.find(s => s.id === record.seasonId);
        return season ? <Tag>{season.name}</Tag> : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Payments',
      dataIndex: 'totalPayments',
      key: 'totalPayments',
      render: (amount: number) => `$${(amount || 0).toFixed(2)}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Program) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => { handleEditProgram(record); }}
          >
            Edit
          </Button>
          <Button
            size="small"
            onClick={() => { handleManageTeams(record); }}
          >
            Teams
          </Button>
          <Button
            size="small"
            onClick={() => { handleDuplicateProgram(record); }}
          >
            Duplicate
          </Button>
          <Popconfirm
            title="Delete Program"
            description={record.currentRegistrants > 0 ?
              'Cannot delete program with existing registrants' :
              'Are you sure you want to delete this program?'
            }
            onConfirm={() => handleDeleteProgram(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.currentRegistrants > 0}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.currentRegistrants > 0}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container full-width">
      <div style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={2}>Programs</Title>
            <Text type="secondary">Manage sports programs and activities</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadPrograms} loading={loading}>
                Refresh
            </Button>
            <Button onClick={() => navigate('/admin/seasons')}>
                Manage Seasons
            </Button>
            <Button onClick={openBulkMove} disabled={selectedRowKeys.length === 0}>
              Move Selected
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProgram}>
                Add Program
            </Button>
          </Space>
        </Space>

        <div style={{ marginTop: 12 }}>
          {(() => {
            const items = [
              { key: 'all', label: 'All Seasons' },
              ...seasons.map(s => ({ key: s.id, label: `${s.name}${s.status === SeasonStatusValues.archived ? ' (Archived)' : ''}` })),
              { key: 'unassigned', label: 'Unassigned' },
            ];
            return (
              <Tabs activeKey={selectedSeasonId} onChange={(k) => setSelectedSeasonId(k)} items={items} />
            );
          })()}
        </div>
      </div>

      <Card title="Program Directory">
        <Spin spinning={loading}>
          <Table
            rowSelection={{ selectedRowKeys, onChange: onSelectChange }}
            columns={columns}
            dataSource={filteredPrograms}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} programs`,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="Move selected programs to season"
        open={bulkModalVisible}
        onCancel={() => setBulkModalVisible(false)}
        onOk={performBulkMove}
      >
        <Form layout="vertical">
          <Form.Item label="Target Season">
            <Select value={bulkTargetSeason || undefined} onChange={(v) => setBulkTargetSeason(v)} placeholder="Select season">
              {seasons.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.name} {s.status === SeasonStatusValues.archived ? '(Archived)' : ''}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <div>
            <small>{selectedRowKeys.length} program(s) will be moved.</small>
          </div>
        </Form>
      </Modal>

      <Modal
        title={editingProgram ? 'Edit Program' : 'Add New Program'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Program Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Spring Baseball League" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="sport" label="Sport" rules={[{ required: true }]}>
              <Select placeholder="Select sport" style={{ width: 150 }}>
                <Select.Option value="baseball">Baseball</Select.Option>
                <Select.Option value="softball">Softball</Select.Option>
                <Select.Option value="basketball">Basketball</Select.Option>
                <Select.Option value="soccer">Soccer</Select.Option>
                <Select.Option value="tennis">Tennis</Select.Option>
                <Select.Option value="other">Other</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="sexRestriction" label="Sex" rules={[{ required: true }]}>
              <Select placeholder="Select restriction" style={{ width: 120 }}>
                <Select.Option value="any">Any</Select.Option>
                <Select.Option value="female">Female</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="seasonId" label="Season">
              <Select placeholder="Select season" style={{ width: 150 }}>
                {seasons.filter(s => s.status === SeasonStatusValues.active).map(season => (
                  <Select.Option key={season.id} value={season.id}>
                    {season.name} ({season.year})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Program description..." />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="birthDateStart" label="Earliest Birth Date">
              <DatePicker placeholder="Oldest allowed" />
            </Form.Item>
            <Form.Item name="birthDateEnd" label="Latest Birth Date">
              <DatePicker placeholder="Youngest allowed" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.birthDateStart !== currentValues.birthDateStart ||
                  prevValues.allowGradeExemption !== currentValues.allowGradeExemption
              }
            >
              {({ getFieldValue }) => {
                const allowGradeExemption = getFieldValue('allowGradeExemption');
                const birthDateStart = getFieldValue('birthDateStart');

                // Auto-compute max grade when birth date start changes and grade exemptions are enabled
                if (allowGradeExemption && birthDateStart) {
                  const now = dayjs();
                  const currentYear = now.year();
                  const isBeforeAugust = now.month() < 7; // January to July (months 0-6)
                  const schoolYear = isBeforeAugust ? currentYear - 1 : currentYear;

                  const calculatedMaxGrade = schoolYear - dayjs(birthDateStart).year() - 6;
                  if (calculatedMaxGrade >= 0 && calculatedMaxGrade <= 12) {
                    setTimeout(() => {
                      form.setFieldsValue({ maxGrade: calculatedMaxGrade });
                    }, 0);
                  }
                }

                return (
                  <Form.Item name="maxGrade" label="Max Grade">
                    <Select placeholder="Max grade" style={{ width: 120 }}>
                      <Select.Option value={0}>Kindergarten</Select.Option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <Select.Option key={i + 1} value={i + 1}>Grade {i + 1}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }}
            </Form.Item>
            <Form.Item name="allowGradeExemption" label="Allow Grade Exemption" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="registrationStart" label="Registration Start" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="registrationEnd" label="Registration End" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="basePrice" label="Base Price ($)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="maxParticipants" label="Max Participants">
              <InputNumber min={1} placeholder="Unlimited" />
            </Form.Item>
            <Form.Item name="active" label="Active Program" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Space>

          {/* payment plans moved to Season-level configuration */}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                  Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProgram ? 'Update Program' : 'Create Program'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});
export default Programs;