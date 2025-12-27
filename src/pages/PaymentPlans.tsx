import { useEffect, useState, useRef } from 'react';
import { Button, Card, Table, Tag, Space, Modal, Spin, Typography, Popconfirm, notification } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { paymentPlansService } from '../services/paymentPlans';
import type { PaymentPlan } from '../types/paymentPlan';
import PaymentPlanForm from './PaymentPlanForm';

const { Title, Text } = Typography;

export default function PaymentPlans() {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentPlan | null>(null);
  const [showModal, setShowModal] = useState(false);
  const errorShownRef = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await paymentPlansService.getPaymentPlans();
      setPlans(data || []);
    } catch (e) {
      console.error(e);
      // avoid showing the same permission error notification multiple times
      if (errorShownRef.current) {
        // already shown the notification for this mount
        setLoading(false);
        return;
      }
      const msg = (e && (e as any).message) || String(e);
      if (msg.toLowerCase().includes('permission')) {
        errorShownRef.current = true;
        notification.error({
          message: 'Permission denied reading payment plans',
          description: 'Your account does not have permission to read payment plans from the database. Ensure your RTDB rules allow admin reads or run this page from an account with admin access.',
          duration: 8,
        });
      } else {
        errorShownRef.current = true;
        notification.error({ message: 'Failed to load payment plans' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (p: PaymentPlan) => {
    setEditing(p);
    setShowModal(true);
  };

  const handleSave = async (vals: Partial<PaymentPlan>) => {
    try {
      if (editing && editing.id) {
        await paymentPlansService.updatePaymentPlan(editing.id, vals);
        notification.success({ message: 'Payment plan updated' });
      } else {
        await paymentPlansService.createPaymentPlan(vals as any);
        notification.success({ message: 'Payment plan created' });
      }
      setShowModal(false);
      await load();
    } catch (e) {
      console.error(e);
      notification.error({ message: 'Failed to save payment plan' });
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await paymentPlansService.deletePaymentPlan(id);
      notification.success({ message: 'Payment plan deleted' });
      await load();
    } catch (e) {
      console.error(e);
      notification.error({ message: 'Failed to delete payment plan' });
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Active', dataIndex: 'active', key: 'active', render: (a: boolean) => (a ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
    { title: 'Initial', dataIndex: 'initialAmount', key: 'initial', render: (v: number) => (v != null ? `$${v.toFixed(2)}` : '-') },
    { title: 'Installments', dataIndex: 'installments', key: 'installments' },
    { title: 'Stripe Price', dataIndex: 'stripePriceId', key: 'stripePriceId' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PaymentPlan) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this plan?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button type="default" onClick={() => window.history.back()}>Back</Button>
        <Title level={3} style={{ margin: 0 }}>Payment Plans</Title>
      </Space>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>Manage global payment plans used by the cart and checkout flows.</Text>

      <Card>
        <Spin spinning={loading}>
          <Space style={{ marginBottom: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Payment Plan</Button>
          </Space>

          <Table
            dataSource={plans.map(p => ({ ...p, key: p.id }))}
            columns={columns}
            pagination={{ pageSize: 20 }}
            rowKey="id"
          />
        </Spin>
      </Card>

      <Modal open={showModal} onCancel={() => setShowModal(false)} footer={null} title={editing ? 'Edit Payment Plan' : 'Create Payment Plan'}>
        <PaymentPlanForm initialValues={editing || null} onCancel={() => setShowModal(false)} onSave={handleSave} />
      </Modal>
    </div>
  );
}
