import { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { sportsService } from '../services/firebaseSports';
import logger from '../utils/logger';

export default function Sports() {
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const list = await sportsService.getSports();
      const sorted = (list || []).slice().sort((a,b) => String((a?.name||'')).localeCompare(String((b?.name||''))));
      setSports(sorted);
    } catch (e) {
      logger.error('Failed loading sports', e);
      message.error('Failed to load sports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalVisible(true); };
  const openEdit = (s: any) => {
    logger.info('Editing sport:', s);
    setEditing(s);
    // defensive mapping in case DB keys differ
    form.setFieldsValue({
      name: s?.name ?? s?.Name ?? '',
      ageControlDate: s?.ageControlDate ?? s?.age_control_date ?? s?.age ?? '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await sportsService.deleteSport(id);
      message.success('Sport deleted');
      load();
    } catch (e) {
      logger.error('Delete failed', e);
      message.error('Failed to delete sport');
    }
  };

  const handleOk = async () => {
    try {
      const vals = await form.validateFields();
      // Validate ageControlDate MM-DD and logical month/day
      const mmdd = String(vals.ageControlDate || '').trim();
      const mmddMatch = mmdd.match(/^(\d{2})-(\d{2})$/);
      if (!mmddMatch) {
        message.error('Age Control must be in MM-DD format');
        return;
      }
      const month = Number(mmddMatch[1]);
      const day = Number(mmddMatch[2]);
      const daysInMonth = [31,29,31,30,31,30,31,31,30,31,30,31];
      if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
        message.error('Age Control date is not a valid month/day');
        return;
      }

      // Validate unique name (case-insensitive) among loaded sports
      const name = String(vals.name || '').trim();
      const duplicate = sports.find(s => (s.name || '').toLowerCase() === name.toLowerCase() && (!(editing && editing.id) || s.id !== editing.id));
      if (duplicate) {
        message.error('A sport with that name already exists');
        return;
      }

      if (editing && editing.id) {
        await sportsService.updateSport(editing.id, { ...vals, name, ageControlDate: mmdd });
        message.success('Sport updated');
      } else {
        await sportsService.createSport({ ...vals, name, ageControlDate: mmdd });
        message.success('Sport created');
      }
      setModalVisible(false);
      load();
    } catch (e) {
      logger.error('Save failed', e);
      message.error('Failed to save sport');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Age Control', dataIndex: 'ageControlDate', key: 'ageControlDate' },
    {
      title: 'Actions', key: 'actions', render: (r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm title="Delete sport?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="page-container full-width">
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Sports</h2>
            <div style={{ color: '#999' }}>Manage sports and their age control dates</div>
          </div>
          <div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Sport</Button>
          </div>
        </Space>
      </div>

      <Card>
        <Table dataSource={sports} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal title={editing ? 'Edit Sport' : 'Add Sport'} open={modalVisible} onOk={handleOk} onCancel={() => setModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ageControlDate" label="Age Control (MM-DD)" rules={[{ required: true, pattern: /^\d{2}-\d{2}$/ }]}>
            <Input placeholder="MM-DD" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
