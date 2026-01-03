import { useEffect, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import logger from '../utils/logger';
import { Form, Input, Row, Col, DatePicker, InputNumber, Segmented, Select, message } from 'antd';
import type { Season } from '../types/season';
import { seasonsService } from '../services/firebaseSeasons';
import { slugify } from '../utils/slugify';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { SeasonStatusValues } from '../types/enums/season';

type Props = {
  season?: Season | null;
  onFinish: (values: any) => void;
  readOnly?: boolean;
};

export type SeasonEditorRef = {
  submit: () => void;
  reset: () => void;
};

const SeasonEditor = forwardRef<SeasonEditorRef, Props>(({ season, onFinish, readOnly },
  ref) => {
  const [form] = Form.useForm();
  const [msgApi, contextHolder] = message.useMessage();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewTaken, setPreviewTaken] = useState(false);

  useImperativeHandle(ref, () => ({
    submit: () => form.submit(),
    reset: () => form.resetFields(),
  }));

  useEffect(() => {
    if (season) {
      form.setFieldsValue({
        name: season.name,
        seasonType: season.seasonType,
        year: season.year,
        startDate: season.startDate ? dayjs(season.startDate) : undefined,
        registrationOpen: (season as any).registrationOpen ? dayjs((season as any).registrationOpen) : undefined,
        registrationClose: (season as any).registrationClose ? dayjs((season as any).registrationClose) : undefined,
        description: season.description,
        status: season.status,
      });
    } else {
      // Defaults for new season
      form.setFieldsValue({
        status: SeasonStatusValues.active,
      });
    }
  }, [season, form]);

  const handleStartDateChange = (date: Dayjs | null) => {
    if (!date) return;
    const startStr = date.format('YYYY-MM-DD');
    const meta = seasonsService.deriveSeasonMeta(startStr);
    form.setFieldsValue({
      startDate: date,
      seasonType: meta.type,
      year: meta.year,
    });
    form.setFields([{ name: 'startDate', errors: [] }]);
    // revalidate registrationClose when season start changes
    try { form.validateFields(['registrationClose']); } catch (error) { logger.error('Failed to validate fields', error); }
  };

  // Debounced wrapper to limit remote duplicate-check calls
  const dupTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    return () => {
      if (dupTimer.current) clearTimeout(dupTimer.current);
    };
  }, []);

  const runDebouncedCheck = (values?: any) => {
    if (readOnly) return;
    if (dupTimer.current) clearTimeout(dupTimer.current);
    dupTimer.current = window.setTimeout(() => {
      void (async () => {
        await computePreviewId(values);
        await checkForDuplicates(values);
      })();
    }, 300) as unknown as number;
  };

  async function computePreviewId(values?: any) {
    try {
      if (season) {
        setPreviewId(season.id);
        setPreviewTaken(false);
        return;
      }
      const v = values || form.getFieldsValue();
      let seasonType = v.seasonType as string | undefined;
      let year = v.year as number | undefined;
      const startDate = v.startDate as any;
      if (startDate && typeof startDate.format === 'function') {
        const meta = seasonsService.deriveSeasonMeta(startDate.format('YYYY-MM-DD'));
        seasonType = meta.type as any;
        year = meta.year;
      }
      if (seasonType && year) {
        const baseId = slugify(`${year}-${seasonType}`);
        setPreviewId(baseId);
        const existing = await seasonsService.getSeasonById(baseId);
        setPreviewTaken(!!existing && existing.id !== (season as any)?.id);
      } else {
        setPreviewId(null);
        setPreviewTaken(false);
      }
    } catch (e) {
      logger.error('Error computing preview id', e);
      setPreviewId(null);
      setPreviewTaken(false);
    }
  }

  const formatSeasonLabel = (s: Season) => {
    const t = s.seasonType || (s as any).seasonType || '';
    const label = t ? (t.charAt(0).toUpperCase() + t.slice(1)) : '';
    return `${label} ${s.year}`.trim();
  };

  const checkForDuplicates = async (values?: any) => {
    if (readOnly) return;
    try {
      const v = values || form.getFieldsValue();
      const name = (v.name || '').trim();
      const startDate = v.startDate as Dayjs | undefined;
      // Prefer computing seasonType/year from provided startDate when available
      let seasonType = v.seasonType as string | undefined;
      let year = v.year as number | undefined;
      if (startDate) {
        const meta = seasonsService.deriveSeasonMeta((startDate as Dayjs).format('YYYY-MM-DD'));
        seasonType = meta.type as any;
        year = meta.year;
      }

      const all = await seasonsService.getSeasons();
      // exclude current season if editing
      const others = all.filter(s => s.id !== (season as any)?.id);

      // check name conflict
      if (name) {
        const dupByName = others.filter(s => (s.name || '').trim().toLowerCase() === name.toLowerCase());
        if (dupByName.length > 0) {
          const earliest = dupByName.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0];
          const label = formatSeasonLabel(earliest as Season);
          form.setFields([{ name: 'name', errors: [`Conflicts with ${label}`] }]);
          msgApi.error(`Name conflicts with ${label}`);
          return true;
        } else {
          form.setFields([{ name: 'name', errors: [] }]);
        }
      }

      // check type+year conflict
      if (seasonType && year) {
        // match by computed seasonType/year: prefer deriving from startDate for each existing season
        const dupByTY = others.filter(s => {
          try {
            if (s.startDate) {
              const meta = seasonsService.deriveSeasonMeta(s.startDate as string);
              return meta.type === seasonType && meta.year === year;
            }
            return s.seasonType === seasonType && s.year === year;
          } catch (e) {
            logger.error('Error deriving season meta for duplicate check', e);
            return s.seasonType === seasonType && s.year === year;
          }
        });
        if (dupByTY.length > 0) {
          const earliest = dupByTY.sort((a, b) => {
            const aDate = (a.startDate ? dayjs(a.startDate).valueOf() : (a.createdAt ? dayjs(a.createdAt).valueOf() : 0));
            const bDate = (b.startDate ? dayjs(b.startDate).valueOf() : (b.createdAt ? dayjs(b.createdAt).valueOf() : 0));
            return aDate - bDate;
          })[0];
          const label = formatSeasonLabel(earliest as Season);
          form.setFields([{ name: 'seasonType', errors: [`Conflicts with ${label}`] }]);
          msgApi.error(`${label} already exists`);
          return true;
        } else {
          form.setFields([{ name: 'seasonType', errors: [] }]);
        }
      }
    } catch (e) {
      logger.error('Duplicate check failed', e);
    }
    return false;
  };

  return (
    <div>
      {contextHolder}
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={(changed, all) => {
      // if seasonType, year, or startDate change (startDate may compute type/year), re-run duplicate checks
      if (changed.startDate || changed.seasonType || changed.year) {
        runDebouncedCheck(all);
      }
    } }>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="name" label="Season Name" rules={[{ required: true, message: 'Please enter season name' }]}>
            <Input placeholder="e.g., Spring 2026" disabled={!!readOnly} onBlur={() => runDebouncedCheck()} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Season ID (computed)">
            <Input value={previewId || ''} readOnly />
            {previewId && previewTaken && <div style={{ color: '#d46b08', marginTop: 6 }}>ID already exists; a unique suffix will be appended on save.</div>}
            {!previewId && <div style={{ color: '#777', marginTop: 6 }}>ID will be generated from year and season type (e.g., 2026-spring).</div>}
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true, message: 'Please select start date' }]}
          >
            <DatePicker
              allowClear={false}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              onChange={handleStartDateChange}
              disabled={!!readOnly} />
          </Form.Item>
        </Col>

        {/* endDate removed — seasons only require a start date */}
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="registrationOpen"
            label="Registration Open"
            rules={[
              { required: true, message: 'Please select registration start' },
              ({ getFieldValue }) => ({
                validator(_, value: Dayjs | undefined) {
                  const regClose = getFieldValue('registrationClose') as Dayjs | undefined;
                  if (!value) return Promise.resolve();
                  if (regClose && value.isAfter(regClose, 'day')) return Promise.reject(new Error('Registration open must be before registration close'));
                  const year = getFieldValue('year') as number | undefined;
                  if (year) {
                    const earliest = dayjs(`${year - 1}-01-01`);
                    if (value.isBefore(earliest, 'day')) return Promise.reject(new Error(`Registration open cannot be earlier than ${earliest.format('YYYY-MM-DD')}`));
                  }
                  return Promise.resolve();
                }
              })
            ]}
          >
            <DatePicker
              allowClear={false}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabled={!!readOnly}
              onChange={() => { try { form.validateFields(['registrationClose']); } catch (error) { logger.error("Failed to validate fields", error); } } } />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            name="registrationClose"
            label="Registration Close"
            rules={[
              { required: true, message: 'Please select registration close' },
              ({ getFieldValue }) => ({
                validator(_, value: Dayjs | undefined) {
                  const regOpen = getFieldValue('registrationOpen') as Dayjs | undefined;
                  if (!value) return Promise.resolve();
                  if (regOpen && value.isBefore(regOpen, 'day')) return Promise.reject(new Error('Registration close must be after registration open'));
                  return Promise.resolve();
                }
              })
            ]}
          >
            <DatePicker
              allowClear={false}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabled={!!readOnly}
              onChange={() => { try { form.validateFields(['registrationOpen']); } catch (error) { logger.error("Failed to validate fields", error); } } } />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="seasonType"
            label="Season Type"
            tooltip="Derived from start date"
          >
            <Select placeholder="(Derived from start date)" disabled>
              <Select.Option value="spring">Spring</Select.Option>
              <Select.Option value="summer">Summer</Select.Option>
              <Select.Option value="fall">Fall</Select.Option>
              <Select.Option value="winter">Winter</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            name="year"
            label="Year"
            tooltip="Derived from start date"
          >
            <InputNumber
              min={2020}
              max={2099}
              style={{ width: '100%' }}
              placeholder="(Derived from start date)"
              disabled />
          </Form.Item>
        </Col>
      </Row>

      {/* Preview moved next to season name */}

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={3} placeholder="Season details" disabled={!!readOnly} />
      </Form.Item>

      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
        <Segmented
          options={Object.entries(SeasonStatusValues).map(([key, val]) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: val,
          }))}
          disabled={!!readOnly} />
      </Form.Item>
      </Form>
    </div>
  );
});

SeasonEditor.displayName = 'SeasonEditor';

export default SeasonEditor;
