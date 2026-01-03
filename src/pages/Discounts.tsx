import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Switch, Tag, notification, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { firebaseDiscounts, Discount } from '../services/firebaseDiscounts';
import { slugify } from '../utils/slugify';
import { programTemplatesService } from '../services/firebaseProgramTemplates';
import type { ProgramTemplate } from '../types/programTemplate';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../components/AdminPageHeader';
import logger from '../utils/logger';

export default function Discounts() {
  const [notifApi, notifContextHolder] = notification.useNotification();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewTaken, setPreviewTaken] = useState(false);
  // advanced panel removed; advanced options always visible to admins (page protected)
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [siblingMode, setSiblingMode] = useState(false);

  const navigate = useNavigate();
  const codeDupTimer = useRef<number | undefined>(undefined);
  const createDefaultsTimer = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await firebaseDiscounts.getDiscounts();
      setDiscounts(data || []);
    } catch (e) {
      logger.error('Failed to load discounts', e);
      notifApi.error({ title: 'Failed to load discounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await programTemplatesService.getTemplates();
        if (mounted) setTemplates(t || []);
      } catch (e) {
        logger.error('Failed to load program templates', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const openCreate = () => {
    setEditing(null);
    // Open modal first so Switch is mounted, then apply defaults shortly after
    setOpen(true);
    setPreviewId(null);
    setPreviewTaken(false);
    if (createDefaultsTimer.current) window.clearTimeout(createDefaultsTimer.current as any);
    createDefaultsTimer.current = window.setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({ active: true, amountType: 'fixed', appliesTo: 'cart', perAdditional: false, perAdditionalAmounts: [] });
      createDefaultsTimer.current = null;
    }, 50) as unknown as number;
  };

  useEffect(() => {
    return () => {
      if (codeDupTimer.current) clearTimeout(codeDupTimer.current);
      if (createDefaultsTimer.current) window.clearTimeout(createDefaultsTimer.current as any);
    };
  }, []);

  const runDebouncedCodeCheck = (code?: string) => {
    if (codeDupTimer.current) clearTimeout(codeDupTimer.current);
    codeDupTimer.current = window.setTimeout(async () => {
      try {
        const val = String((code ?? form.getFieldValue('code')) || '').trim();
        if (!val) { form.setFields([{ name: 'code', errors: [] }]); return; }
        const all = await firebaseDiscounts.getDiscounts();
        const norm = val.toLowerCase();
        const dup = all.find(d => (d.code || '').toLowerCase() === norm && (!(editing && editing.id) || d.id !== editing.id));
        if (dup) {
          form.setFields([{ name: 'code', errors: ['A discount with that code already exists'] }]);
          return;
        }
        // check id collision for slugified code and expose preview to UI
        const id = slugify(val);
        setPreviewId(id);
        const idTaken = all.find(d => d.id === id && (!(editing && editing.id) || d.id !== editing.id));
        if (idTaken) {
          form.setFields([{ name: 'code', errors: ['Computed id from code collides with existing discount id'] }]);
          setPreviewTaken(true);
        } else {
          form.setFields([{ name: 'code', errors: [] }]);
          setPreviewTaken(false);
        }
        // update sibling mode
        const codeVal = String((code ?? form.getFieldValue('code')) || '').trim();
        const isSibling = codeVal.toLowerCase() === 'sibling' || slugify(codeVal).toLowerCase() === 'sibling';
        if (isSibling !== siblingMode) {
          setSiblingMode(isSibling);
          if (isSibling) {
            // enforce sibling defaults in form and set default per-additional amounts
            form.setFieldsValue({ amountType: 'fixed', appliesTo: 'line_item', perAdditional: true, perAdditionalAmounts: [10, 10, 10], amount: '0' });
          } else {
            // non-sibling discounts must not be per-additional
            form.setFieldsValue({ perAdditional: false, perAdditionalAmounts: [] });
          }
        }
      } catch (e) {
        logger.error('Code duplicate check failed', e);
      }
    }, 300) as unknown as number;
  };

  const openEdit = (d: Discount) => {
    setEditing(d);
    (async () => {
      try {
        const full = await firebaseDiscounts.getDiscountById(d.id);
        // prefer freshest values from `full` fetched record over the table row
        const src = { ...(d || {}), ...(full || {}) } as any;
        const fv: any = {
          code: (src.code ?? '').toString().toUpperCase(),
          amountType: src.amountType ?? 'fixed',
          amount: src.amount !== undefined && src.amount !== null ? String(src.amount) : '',
          appliesTo: src.appliesTo ?? 'cart',
          description: src.description ?? '',
          active: src.active === undefined || src.active === null ? false : Boolean(src.active),
          allowedProgramTemplateIds: Array.isArray(src.allowedProgramTemplateIds) ? src.allowedProgramTemplateIds : (src.allowedProgramTemplateIds ? String(src.allowedProgramTemplateIds).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
          perAdditional: src.perAdditional ?? false,
          perAdditionalAmounts: Array.isArray(src.perAdditionalAmounts) ? src.perAdditionalAmounts.map((n: any) => Number(n)) : (src.perAdditionalAmounts ? String(src.perAdditionalAmounts).split(',').map((s: string) => Number(s.trim())).filter(n => !Number.isNaN(n)) : []),
        };
        form.resetFields();
        form.setFieldsValue(fv);
        const isSibling = String((fv.code || '')).trim().toLowerCase() === 'sibling' || slugify(String(fv.code || '')).toLowerCase() === 'sibling';
        setSiblingMode(isSibling);
        if (isSibling) {
          form.setFieldsValue({ amountType: 'fixed', appliesTo: 'line_item', perAdditional: true, perAdditionalAmounts: (fv.perAdditionalAmounts && fv.perAdditionalAmounts.length) ? fv.perAdditionalAmounts : [10,10,10] });
        } else {
          form.setFieldsValue({ perAdditional: false, perAdditionalAmounts: [] });
        }
        // show the canonical DB id for the discount being edited
        setPreviewId(full?.id || d.id);
        setPreviewTaken(false);
      } catch (e) {
        logger.error('Failed loading discount for edit', e);
        form.setFieldsValue({ ...d });
      }
    })();
    setOpen(true);
  };

  const handleSave = async (vals: any) => {
    try {
      logger.info('Saving discount, editing:', editing && editing.id, 'vals:', vals);
      // send raw form values to service; service normalizes payload
      if (editing && editing.id) {
        await firebaseDiscounts.updateDiscount(editing.id, vals);
        notifApi.success({ title: 'Discount updated' });
        // refresh preview id from server
        const fresh = await firebaseDiscounts.getDiscountById(editing.id);
        setPreviewId(fresh?.id || editing.id);
        setPreviewTaken(false);
      } else {
        const newId = await firebaseDiscounts.createDiscount(vals);
        // fetch created discount so the modal can show the canonical DB key and details
        const created = await firebaseDiscounts.getDiscountById(newId);
        setEditing(created);
        setPreviewId(newId);
        setPreviewTaken(false);
        notifApi.success({ title: 'Discount created' });
        await load();
        // close modal after create and reset editor state
        form.resetFields();
        setOpen(false);
        setEditing(null);
        setPreviewId(null);
        setPreviewTaken(false);
        return;
      }
      await load();
    } catch (e) {
      logger.error('Failed to save discount', e);
      const msg = (e instanceof Error) ? e.message : String(e);
      let title = 'Failed to save discount';
      if (msg.toLowerCase().includes('code already exists')) title = 'Duplicate code';
      if (msg.toLowerCase().includes('id already exists') || msg.toLowerCase().includes('collides')) title = 'Duplicate id';
      notifApi.error({ title, description: msg });
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await firebaseDiscounts.deleteDiscount(id);
      notifApi.success({ title: 'Discount deleted' });
      await load();
    } catch (e) {
      logger.error('Failed to delete discount', e);
      notifApi.error({ title: 'Failed to delete discount' });
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 180, render: (id: string) => <span style={{ fontFamily: 'monospace' }}>{id}</span> },
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Amount', key: 'amount', render: (_: any, r: Discount) => (r.amountType === 'percent' ? `${r.amount}%` : `$${r.amount}`) },
    { title: 'Applies To', dataIndex: 'appliesTo', key: 'appliesTo' },
    { title: 'Active', dataIndex: 'active', key: 'active', render: (a: boolean) => (a ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
    {
      title: 'Actions', key: 'actions', render: (_: any, record: Discount) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this discount?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {notifContextHolder}
      <AdminPageHeader
        title="Discounts"
        subtitle={null}
        nav={<Button type="link" onClick={() => navigate('/admin/season-discounts')}>Season Links</Button>}
        actions={
          <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Discount</Button>
              <Button onClick={async () => {
                try {
                  const created = await firebaseDiscounts.ensureDefaultGlobalDiscounts();
                  if (created && created.length) {
                    notifApi.success({ title: `Created defaults: ${created.join(', ')}` });
                  } else {
                    notifApi.info({ title: 'Default discounts already present' });
                  }
                  await load();
                } catch (e) {
                  logger.error('Failed to ensure default discounts', e);
                  notifApi.error({ title: 'Failed to ensure default discounts' });
                }
              }}>Ensure Defaults</Button>
              <Button onClick={() => navigate('/admin/season-discounts')}>Manage Season Links</Button>
            </div>
            <div style={{ marginLeft: 'auto', paddingLeft: 12 }} />
          </div>
        }
      />
      <Card>
        <Table dataSource={discounts.map(d => ({ ...d, key: d.id }))} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal destroyOnHidden={false} open={open} onCancel={() => setOpen(false)} footer={null} title={editing ? 'Edit Discount' : 'Create Discount'}>
          <Form form={form} layout="vertical" onFinish={handleSave} onValuesChange={(changed, all) => {
            if (changed.code !== undefined) {
              const isSibling = String((all.code || '')).trim().toLowerCase() === 'sibling' || slugify(String(all.code || '')).toLowerCase() === 'sibling';
              setSiblingMode(isSibling);
              if (isSibling) {
                form.setFieldsValue({ amountType: 'fixed', appliesTo: 'line_item', perAdditional: true, perAdditionalAmounts: [10,10,10], amount: '0' });
              }
            }
            if (changed.active !== undefined) {
              if (createDefaultsTimer.current) {
                window.clearTimeout(createDefaultsTimer.current as any);
                createDefaultsTimer.current = null;
              }
            }
          }} initialValues={{ active: true, amountType: 'fixed', appliesTo: 'cart' }}>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input
              onBlur={() => runDebouncedCodeCheck()}
              onChange={(e) => {
                const upper = String(e.target.value || '').toUpperCase();
                form.setFieldsValue({ code: upper });
                runDebouncedCodeCheck(upper);
              }}
            />
          </Form.Item>
          <Form.Item label="Discount ID (computed)">
            <Input value={previewId || ''} readOnly />
            {previewId && previewTaken && <div style={{ color: '#d46b08', marginTop: 6 }}>ID already exists; a unique suffix will be appended on save.</div>}
            {!previewId && <div style={{ color: '#777', marginTop: 6 }}>ID will be generated from the discount code (e.g., sibling).</div>}
          </Form.Item>
          {/* Scope/year removed — discounts are global and enabled per-season via season overlays */}
          <Form.Item name="amountType" label="Amount Type">
            <Select options={[{ value: 'fixed', label: 'fixed' }, { value: 'percent', label: 'percent' }]} disabled={siblingMode} />
          </Form.Item>
          {siblingMode && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Sibling discounts are always fixed amounts and apply per line item.</div>}
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input disabled={siblingMode} />
          </Form.Item>
          {siblingMode && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Sibling primary amount is fixed at $0 and cannot be changed.</div>}
          <Form.Item name="appliesTo" label="Applies To">
            <Select options={[{ value: 'cart', label: 'cart' }, { value: 'line_item', label: 'line_item' }]} disabled={siblingMode} />
          </Form.Item>
          <Form.Item name="allowedProgramTemplateIds" label="Allowed Program Templates">
            <Select
              mode="multiple"
              showSearch={{ filterOption: (input: string, option: any) => {
                const label = (option as any)?.label ?? (option as any)?.children;
                return String(label || '').toLowerCase().includes(String(input).toLowerCase());
              } }}
              placeholder="Select program templates"
              options={templates.map(t => ({ value: t.id, label: t.id }))}
              style={{ minWidth: 240 }}
            />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#777', marginTop: 6 }}>Select program template IDs that this discount applies to. Leave blank to apply to all programs.</div>
          <Form.Item label="Apply per-additional">
            <Switch checked={form.getFieldValue('perAdditional')} onChange={(v) => form.setFieldsValue({ perAdditional: v })} disabled />
          </Form.Item>

          {/** Render per-additional inputs when enabled (2nd -> 5th/4+) */}
          <Form.Item shouldUpdate={(prev, cur) => prev.perAdditional !== cur.perAdditional} noStyle>
            {() => {
              const enabled = form.getFieldValue('perAdditional');
              if (!enabled) return null;
              return (
                <div>
                  <div style={{ marginBottom: 8, fontSize: 12, color: '#777' }}>Configure per-additional discounts (first registration is not discounted).</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12, alignItems: 'center' }}>
                    <div>1st Athlete</div>
                    <div>$0</div>
                    {['2nd Athlete','3rd Athlete','4th+ Athlete'].map((label, idx) => (
                      <React.Fragment key={label}>
                        <div>{label}</div>
                        <Form.Item name={[ 'perAdditionalAmounts', idx ]} key={`amt-${label}`} style={{ margin: 0 }}>
                          <InputNumber
                            style={{ width: '100%' }}
                            formatter={(v:any) => v === undefined || v === null ? '' : `$ ${v}`}
                            parser={(v:any) => {
                              if (!v && v !== 0) return 0;
                              const s = String(v).replace(/\$\s?|(,*)/g, '');
                              const n = Number(s);
                              return Number.isNaN(n) ? 0 : n;
                            }}
                            min={0}
                          />
                        </Form.Item>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            }}
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button htmlType="submit" type="primary">Save</Button>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
