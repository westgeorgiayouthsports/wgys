import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  message,
  notification,
  DatePicker,
  Tag,
} from 'antd';
import type { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import { programTemplatesService } from '../services/firebaseProgramTemplates';
import { seasonProgramsService } from '../services/firebaseSeasonPrograms';
import { seasonsService } from '../services/firebaseSeasons';
import { sportsService } from '../services/firebaseSports';
import type { SeasonProgram } from '../services/firebaseSeasonPrograms';
import type { ProgramTemplate } from '../types/programTemplate';
import type { Season } from '../types/season';
import { getProgramTypeLabel, ProgramTypeItems } from '../types/enums/program';
import dayjs from 'dayjs';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import AdminPageHeader from '../components/AdminPageHeader';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';

// program type labels are provided by `getProgramTypeLabel` from enums

export default function ProgramTemplates() {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewTaken, setPreviewTaken] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [seasonPrograms, setSeasonPrograms] = useState<SeasonProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ProgramTemplate | null>(null);
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [attachTemplate, setAttachTemplate] = useState<ProgramTemplate | null>(null);
  const [form] = Form.useForm();
  const [attachForm] = Form.useForm();

  useEffect(() => { loadAll(); }, []);

  if (role !== 'admin' && role !== 'owner') {
    return <div style={{ padding: 48 }}>Access Denied</div>;
  }

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tpls, seas, sps, spsList] = await Promise.all([
        programTemplatesService.getTemplates(),
        seasonsService.getSeasons(),
        sportsService.getSports(),
        seasonProgramsService.getSeasonPrograms(),
      ]);
      setTemplates(tpls);
      setSeasons(seas);
      setSports(sps || []);
      setSeasonPrograms(spsList || []);
    } catch (e) {
        logger.error('Error loading templates', e);
      message.error('Failed to load');
    } finally { setLoading(false); }
  };

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    setPreviewId(null);
    setPreviewTaken(false);
    setModalVisible(true);
  };

  const handleEdit = (tpl: ProgramTemplate) => {
    setEditing(tpl);
    form.setFieldsValue({ ...tpl });
    setPreviewId(tpl.id);
    setPreviewTaken(false);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await programTemplatesService.deleteTemplate(id, user?.uid);
      setTemplates(templates.filter(t => t.id !== id));
      message.success('Template deleted');
    } catch (e) {
        logger.error('Error deleting template', e);
      message.error('Failed to delete');
    }
  };

  const computeTemplatePreview = (values: any) => {
    if (editing) {
      setPreviewId(editing.id);
      setPreviewTaken(false);
      return;
    }
    const sportId = values.sportId || '';
    const programType = values.programType || '';
    if (sportId && programType) {
      const id = slugify(`${sportId}-${programType}`);
      setPreviewId(id);
      const taken = templates.find(t => t.id === id);
      setPreviewTaken(!!taken);
    } else {
      setPreviewId(null);
      setPreviewTaken(false);
    }
  };

  const submitTemplate = async (vals: any) => {
    try {
      if (editing) {
        await programTemplatesService.updateTemplate(editing.id, vals, user?.uid);
        setTemplates(templates.map(t => t.id === editing.id ? { ...t, ...vals } : t));
        message.success('Template updated');
      } else {
        const id = await programTemplatesService.createTemplate(vals, user?.uid);
        const created = await programTemplatesService.getTemplateById(id);
        setEditing(created);
        setPreviewId(id);
        setPreviewTaken(false);
        message.success('Template created');
        await loadAll();
        // keep modal open so user can see the generated template id
        setModalVisible(true);
        return;
      }
      setModalVisible(false);
      form.resetFields();
    } catch (e) { logger.error('Error saving template', e); message.error('Save failed'); }
  };

  const openAttach = (tpl: ProgramTemplate) => {
    setAttachTemplate(tpl);
    attachForm.resetFields();
    setAttachModalVisible(true);
  };

  const submitAttach = async (vals: any) => {
    if (!attachTemplate) return;
    try {
      const payload = {
        seasonId: vals.seasonId,
        programId: attachTemplate.id,
        enabled: vals.isOpenForRegistration ?? true,
        basePrice: vals.feeOverride ?? attachTemplate.defaultBaseFee ?? null,
        registrationOpen: vals.registrationOpen ? dayjs(vals.registrationOpen).format('YYYY-MM-DD') : null,
        registrationClose: vals.registrationClose ? dayjs(vals.registrationClose).format('YYYY-MM-DD') : null,
        createdBy: user?.uid || null,
      } as any;
      await seasonProgramsService.createSeasonProgram(payload, user?.uid);
      message.success('Template attached to season');
      setAttachModalVisible(false);
    } catch (e) { logger.error('Error attaching template to season', e); message.error('Attach failed'); }
  };

  const columns = [
    { title: 'Sport', key: 'sport', render: (r: ProgramTemplate) => {
      const s = sports.find(s => s.id === r.sportId);
      return s ? s.name : (r.sportId || '-');
    } },
    // Division column removed — base templates are not division-specific
    { title: 'Type', key: 'programType', render: (r: ProgramTemplate) => getProgramTypeLabel(r.programType as any) },
    { title: 'Template ID', dataIndex: 'id', key: 'id' },
    { title: 'Default Fee', dataIndex: 'defaultBaseFee', key: 'defaultBaseFee', render: (v:number) => v ? `$${(v)}` : '-' },
    { title: 'Status', key: 'active', render: (r: ProgramTemplate) => (<TagActive active={!!r.active} />) },
    { title: 'Actions', key: 'actions', render: (r: ProgramTemplate) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>Edit</Button>
        <Button size="small" onClick={() => openAttach(r)}>Attach to Season</Button>
        <Button size="small" danger onClick={() => handleDelete(r.id)}>Delete</Button>
      </Space>
    )},
  ];

  const expandable = {
    expandedRowRender: (record: ProgramTemplate) => {
      const attached = seasonPrograms.filter((sp) => sp.programId === record.id);
      if (!attached || attached.length === 0) return <div style={{ color: '#888' }}>Not attached to any seasons</div>;
      return (
        <div>
          {attached.map((sp: SeasonProgram) => {
            const s = seasons.find((se) => se.id === sp.seasonId);
              // `record` is the program template row; use it as the base template for defaults
              const baseTemplate = record as ProgramTemplate;
              const isOpen = (sp.enabled !== undefined && sp.enabled !== null) ? sp.enabled : (baseTemplate.active ?? false);
              const feeVal = (sp.basePrice !== undefined && sp.basePrice !== null) ? sp.basePrice : (baseTemplate.defaultBaseFee ?? null);
              const feeDisplay = feeVal != null ? `$${feeVal}` : '-';
              const regOpenSrc = sp.registrationOpen ? 'seasonProgram' : (s?.startDate ? 'season' : undefined);
              const regCloseSrc = sp.registrationClose ? 'seasonProgram' : (s?.endDate ? 'season' : undefined);

              const regOpen = regOpenSrc === 'seasonProgram'
                ? dayjs(sp.registrationOpen).format('MMM D, YYYY')
                : regOpenSrc === 'season'
                  ? dayjs(s!.startDate as string).format('MMM D, YYYY')
                  : '-';

              const regClose = regCloseSrc === 'seasonProgram'
                ? dayjs(sp.registrationClose).format('MMM D, YYYY')
                : regCloseSrc === 'season'
                  ? dayjs(s!.endDate as string).format('MMM D, YYYY')
                  : '-';

              const regOpenLabel = regOpen;
              const regCloseLabel = regClose;

              return (
                <div key={sp.id} style={{ marginBottom: 8 }}>
                  <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/seasons/${s ? s.id : sp.seasonId}`)}>{s ? s.name : sp.seasonId}</Tag>
                  <span style={{ marginLeft: 8, marginRight: 12 }}>{isOpen ? 'Open' : 'Closed'}</span>
                  <span style={{ marginRight: 12 }}>Fee: {feeDisplay}</span>
                  <span>Reg: {regOpenLabel} → {regCloseLabel}</span>
                </div>
              );
            })}
        </div>
      );
    }
  };

  return (
    <div className="page-container">
      <AdminPageHeader
        title="Program Templates"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={loading}>New Template</Button>
            <Button onClick={async () => {
              try {
                const created = await programTemplatesService.ensureDefaultProgramTemplates();
                if (created && created.length) {
                  message.success(`Created defaults: ${created.join(', ')}`);
                } else {
                  message.info('Default program templates already present');
                }
                await loadAll();
              } catch (e) {
                  logger.error('Failed to ensure default templates', e);
                  const emsg = (e && (e as any).message) ? (e as any).message : String(e);
                  if (emsg.toLowerCase().includes('permission') || emsg.includes('PERMISSION_DENIED')) {
                    notification.error({
                      message: 'Permission denied',
                      description: 'Your Firebase Realtime Database rules prevented writing program templates. As an admin, either run the server-side seed script (`npm run seed:program-templates` with a service account and `FIREBASE_DATABASE_URL`) or update your RTDB rules to allow admin writes.',
                      duration: 10,
                    });
                  } else {
                    message.error('Failed to ensure defaults');
                  }
                }
            }}>Ensure Defaults</Button>
          </div>
        }
      />

      <Card>
        <Table dataSource={templates} columns={columns as any} rowKey="id" loading={loading} expandable={expandable} />
      </Card>

      <Modal open={modalVisible} title={editing ? 'Edit Template' : 'New Template'} onCancel={() => setModalVisible(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={submitTemplate} onValuesChange={(all) => computeTemplatePreview(all)}>
          <Form.Item name="sportId" label="Sport" rules={[{ required: true }]}>
            <Select>
              {sports.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Template ID (computed)">
            <InputNumber style={{ display: 'none' }} />
            <input value={previewId || ''} readOnly style={{ width: '100%', fontFamily: 'monospace', border: '1px solid #d9d9d9', padding: '6px 8px', borderRadius: 2 }} />
            {previewId && previewTaken && <div style={{ color: '#d46b08', marginTop: 6 }}>ID already exists; a unique suffix will be appended on save.</div>}
            {!previewId && <div style={{ color: '#777', marginTop: 6 }}>ID will be generated from sport and program type (e.g., baseball-recreation).</div>}
          </Form.Item>
          {/* Division removed from base templates UI per request */}
          <Form.Item name="sex" label="Sex Restriction">
            <Select allowClear>
              <Select.Option value="any">Any</Select.Option>
              <Select.Option value="male">Male</Select.Option>
              <Select.Option value="female">Female</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="programType" label="Program Type" rules={[{ required: true }]}>
            <Select>
              {ProgramTypeItems.map((p) => (
                <Select.Option key={p.value} value={p.value}>{p.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="defaultBaseFee" label="Default Base Fee">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={attachModalVisible} title={`Attach ${attachTemplate?.id ?? ''} to Season`} onCancel={() => setAttachModalVisible(false)} onOk={() => attachForm.submit()}>
        <Form form={attachForm} layout="vertical" onFinish={submitAttach}>
          <Form.Item name="seasonId" label="Season" rules={[{ required: true }]}>
            <Select>
              {seasons.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="isOpenForRegistration" label="Open for Registration" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="registrationOpen" label="Registration Open">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="registrationClose" label="Registration Close">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="feeOverride" label="Fee Override (dollars)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function TagActive({ active }: { active: boolean }) {
  return <span style={{ color: active ? 'green' : 'gray' }}>{active ? 'Active' : 'Inactive'}</span>;
}
