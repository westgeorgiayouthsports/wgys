import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Select,
  AutoComplete,
  InputNumber,
  Switch,
  message,
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
import { ProgramDivisionList, getProgramTypeLabel, ProgramTypeItems } from '../types/enums/program';
import dayjs from 'dayjs';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

// program type labels are provided by `getProgramTypeLabel` from enums

export default function AdminProgramTemplates() {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
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
      console.error('Error loading templates', e);
      message.error('Failed to load');
    } finally { setLoading(false); }
  };

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (tpl: ProgramTemplate) => {
    setEditing(tpl);
    form.setFieldsValue({ ...tpl });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await programTemplatesService.deleteTemplate(id, user?.uid);
      setTemplates(templates.filter(t => t.id !== id));
      message.success('Template deleted');
    } catch (e) {
      console.error(e);
      message.error('Failed to delete');
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
        setTemplates([...templates, { id, ...vals } as ProgramTemplate]);
        message.success('Template created');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (e) { console.error(e); message.error('Save failed'); }
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
        registrationStart: vals.registrationStart ? dayjs(vals.registrationStart).format('YYYY-MM-DD') : null,
        registrationEnd: vals.registrationEnd ? dayjs(vals.registrationEnd).format('YYYY-MM-DD') : null,
        createdBy: user?.uid || null,
      } as any;
      await seasonProgramsService.createSeasonProgram(payload, user?.uid);
      message.success('Template attached to season');
      setAttachModalVisible(false);
    } catch (e) { console.error(e); message.error('Attach failed'); }
  };

  const columns = [
    { title: 'Active', key: 'active', render: (r: ProgramTemplate) => (<TagActive active={!!r.active} />) },
    { title: 'Template ID', dataIndex: 'id', key: 'id' },
    { title: 'Sport', key: 'sport', render: (r: ProgramTemplate) => {
      const s = sports.find(s => s.id === r.sportId);
      return s ? s.name : (r.sportId || '-');
    } },
    { title: 'Division', key: 'divisionKey', render: (r: ProgramTemplate) => {
      const div = r.divisionKey;
      if (!div) return '-';
      const isStd = ProgramDivisionList.includes(div as any);
      return isStd ? <Tag>{div}</Tag> : <span>{div}</span>;
    } },
    { title: 'Type', key: 'programType', render: (r: ProgramTemplate) => getProgramTypeLabel(r.programType as any) },
    { title: 'Default Fee', dataIndex: 'defaultBaseFee', key: 'defaultBaseFee', render: (v:number) => v ? `$${(v)}` : '-' },
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
              const regStartSrc = sp.registrationStart ? 'seasonProgram' : (s?.startDate ? 'season' : undefined);
              const regEndSrc = sp.registrationEnd ? 'seasonProgram' : (s?.endDate ? 'season' : undefined);

              const regStart = regStartSrc === 'seasonProgram'
                ? dayjs(sp.registrationStart).format('MMM D, YYYY')
                : regStartSrc === 'season'
                  ? dayjs(s!.startDate as string).format('MMM D, YYYY')
                  : '-';

              const regEnd = regEndSrc === 'seasonProgram'
                ? dayjs(sp.registrationEnd).format('MMM D, YYYY')
                : regEndSrc === 'season'
                  ? dayjs(s!.endDate as string).format('MMM D, YYYY')
                  : '-';

              const regStartLabel = regStart;
              const regEndLabel = regEnd;

              return (
                <div key={sp.id} style={{ marginBottom: 8 }}>
                  <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/seasons/${s ? s.id : sp.seasonId}`)}>{s ? s.name : sp.seasonId}</Tag>
                  <span style={{ marginLeft: 8, marginRight: 12 }}>{isOpen ? 'Open' : 'Closed'}</span>
                  <span style={{ marginRight: 12 }}>Fee: {feeDisplay}</span>
                  <span>Reg: {regStartLabel} → {regEndLabel}</span>
                </div>
              );
            })}
        </div>
      );
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>Program Templates</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={loading}>New Template</Button>
        </Space>
      </div>

      <Card>
        <Table dataSource={templates} columns={columns as any} rowKey="id" loading={loading} expandable={expandable} />
      </Card>

      <Modal open={modalVisible} title={editing ? 'Edit Template' : 'New Template'} onCancel={() => setModalVisible(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={submitTemplate}>
          <Form.Item name="sportId" label="Sport" rules={[{ required: true }]}>
            <Select>
              {sports.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="divisionKey" label="Division" rules={[{ required: true }]}>
            <AutoComplete
              options={ProgramDivisionList.map((d) => ({ value: d }))}
              placeholder="Select or type division (e.g. 10U)"
              filterOption={(inputValue, option) => (option?.value as string).toLowerCase().includes(inputValue.toLowerCase())}
            />
          </Form.Item>
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
          <Form.Item name="registrationStart" label="Registration Start">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="registrationEnd" label="Registration End">
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
