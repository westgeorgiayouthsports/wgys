import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Select, Button, Space } from 'antd';
import type { PaymentPlan } from '../types/paymentPlan';
import { seasonsService } from '../services/firebaseSeasons';
import { programsService } from '../services/firebasePrograms';
import type { Season } from '../types/season';
import type { Program } from '../types/program';

interface Props {
  initialValues?: Partial<PaymentPlan> | null;
  onCancel: () => void;
  onSave: (values: Partial<PaymentPlan>) => Promise<void> | void;
}

export default function PaymentPlanForm({ initialValues, onCancel, onSave }: Props) {
  const [form] = Form.useForm<Partial<PaymentPlan>>();
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [programs, setPrograms] = React.useState<Program[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, p] = await Promise.all([seasonsService.getSeasons(), programsService.getPrograms()]);
        setSeasons(s);
        setPrograms(p);
      } catch (e) {
        console.error('Failed loading seasons/programs', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    form.setFieldsValue({ ...(initialValues || {}) });
  }, [initialValues]);

  const submit = async () => {
    const vals = await form.validateFields();
    await onSave(vals);
  };

  return (
    <Form layout="vertical" form={form} initialValues={initialValues || { active: true }}>
      <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name' }]}>
        <Input />
      </Form.Item>

      <Form.Item name="active" label="Active" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name="initialAmount" label="Initial Amount (USD)">
        <InputNumber min={0} precision={2} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="installments" label="Installments">
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="paymentDay" label="Payment Day (1-28)">
        <InputNumber min={1} max={28} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="stripePriceId" label="Stripe Price ID">
        <Input />
      </Form.Item>

      <Form.Item name="stripeProductId" label="Stripe Product ID">
        <Input />
      </Form.Item>

      <Form.Item name="seasonId" label="Season (optional)">
        <Select allowClear showSearch options={seasons.map(s => ({ label: s.name, value: s.id }))} />
      </Form.Item>

      <Form.Item name="programIds" label="Programs (optional)">
        <Select mode="multiple" allowClear showSearch options={programs.map(p => ({ label: p.name, value: p.id }))} />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={submit}>Save</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
