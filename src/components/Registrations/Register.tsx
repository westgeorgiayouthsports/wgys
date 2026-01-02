import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import calculateCurrentGrade from '../../utils/grade';
import { Form, Input, InputNumber, Select, Button, Space, Typography, Tag, theme, Checkbox, Upload, message, Modal, Progress } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { addItem, removeItem } from '../../store/slices/cartSlice';
import { seasonsService } from '../../services/firebaseSeasons';
import { storageService } from '../../services/storageService';
import type { Program } from '../../types/program';

const { Title, Text } = Typography;

interface Props {
  program: Program;
  athleteId?: string | null;
  visible?: boolean; // not used for full-page render but kept for compatibility
  onClose?: () => void;
  isPreview?: boolean;
  familyMembers?: any[];
  parentInfo?: { name?: string; email?: string; phone?: string } | null;
  defaultPaymentMethodId?: string | null;
}

export default function Register(props: Props) {
  const { program, athleteId, onClose, isPreview, familyMembers = [], parentInfo, defaultPaymentMethodId } = props;
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(athleteId || null);
  const [seasonName, setSeasonName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const uploadedPathsRef = useRef<Record<string, string[]>>({});
  const [formValid, setFormValid] = useState(true);
  const isFormValidLight = (vals: any) => {
    try {
      // gather keys if needed in future; currently iterate program.questions
      for (const q of program.questions || []) {
        const key = `q_${q.id}`;
        const val = vals[key];
        if (q.required) {
          if (q.type === 'checkboxes') {
            if (!Array.isArray(val) || val.length === 0) return false;
          } else if (q.type === 'file_upload') {
            if (!val || !(val.fileUrl || val.storagePath || val.name)) return false;
          } else if (q.type === 'waiver') {
            if (val !== true) return false;
          } else if (q.type === 'numeric') {
            if (val === null || val === undefined || String(val).trim() === '') return false;
            const n = Number(val);
            if (!Number.isInteger(n)) return false;
            if (n < 0 || n > 2147483647) return false;
          } else if (q.type === 'jersey_number') {
            if (val === null || val === undefined || String(val).trim() === '') return false;
            const s = String(val).trim();
            if (!/^\d{1,2}$/.test(s)) return false;
            const num = Number(s);
            if (!Number.isInteger(num) || num < 0 || num > 99) return false;
          } else {
            if (val === null || val === undefined || String(val).trim() === '') return false;
          }
        } else {
          // if not required but provided, still validate format for numeric/jersey
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            if (q.type === 'numeric') {
              const n = Number(val);
              if (!Number.isInteger(n) || n < 0 || n > 2147483647) return false;
            }
            if (q.type === 'jersey_number') {
              const s = String(val).trim();
              if (!/^\d{1,2}$/.test(s)) return false;
              const num = Number(s);
              if (!Number.isInteger(num) || num < 0 || num > 99) return false;
            }
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  };
  // payment will be handled at cart checkout

  const getSeasonControlDate = () => {
    // Prefer explicit season year if available, otherwise pick the typical season year
    const now = dayjs();
    const isAfterAugust = now.month() >= 7; // Aug is month 7 (0-indexed)
    // Determine year: prefer program.season?.year or program.year, else choose current/next year as RegistrationHelp does
    const year = (program as any).season?.year || (program as any).year || (isAfterAugust ? now.year() + 1 : now.year());
    // Determine month by sport: softball -> Jan 1, baseball -> May 1. Default to May 1.
    const sport = (program as any).sport || 'baseball';
    const month = sport === 'softball' ? 0 : 4; // Jan = 0, May = 4
    return dayjs().year(year).month(month).date(1);
  };

  // use shared calculateCurrentGrade; pass season cutoffDate when available

  useEffect(() => {
    if (athleteId) setSelectedAthleteId(athleteId);
    if (parentInfo) {
      form.setFieldsValue({ parentName: parentInfo.name, parentEmail: parentInfo.email, phone: parentInfo.phone });
    }
    // If preview mode and no athlete selected, pick the first sample athlete so preview shows a name
    if (isPreview && (!selectedAthleteId || selectedAthleteId === null) && familyMembers && familyMembers.length > 0) {
      setSelectedAthleteId(familyMembers[0].id);
    }

    // Load season name if program has seasonId
    (async () => {
      try {
        const sid = (program as any).seasonId || (program as any).season || null;
        if (sid) {
          const s = await seasonsService.getSeasonById(sid as string);
          setSeasonName(s ? s.name : null);
        } else {
          setSeasonName(null);
        }
      } catch {
        setSeasonName(null);
      }
    })();
    // Initialize formValid based on current form values and any field errors
    const initVals = form.getFieldsValue();
    const hasFieldErrors = form.getFieldsError().some(f => f.errors && f.errors.length > 0);
    setFormValid(!hasFieldErrors && isFormValidLight(initVals));
  }, [athleteId, parentInfo, form]);

  const updateFormValid = (allValues: any) => {
    // use Ant Form's current field error state plus lightweight checks
    const hasFieldErrors = form.getFieldsError().some(f => f.errors && f.errors.length > 0);
    setFormValid(!hasFieldErrors && isFormValidLight(allValues));
  };

  const handleFinish = async (values: any) => {
    // Allow preview submissions to add a dummy/preview cart item
    // Add to cart instead of submitting; payment collected at checkout
    const id = `${Date.now()}-${Math.floor(Math.random()*100000)}`;
    const price = program.basePrice || 0;
    const athlete = familyMembers.find(f => f.id === selectedAthleteId);
    // Resolve any file uploads in responses first (upload to storage and replace with fileUrl)
    const resolvedResponses: any[] = [];
    const qKeys = Object.keys(values).filter(k => k.startsWith('q_'));
    for (const k of qKeys) {
      const raw = values[k];
      if (raw instanceof File) {
        try {
          const path = `uploads/${Date.now()}_${raw.name}`;
          const { url, path: storedPath } = await storageService.uploadFileWithProgress(path, raw, (pct) => {
            setUploadProgress(prev => ({ ...prev, [k]: pct }));
          });
          resolvedResponses.push({ questionId: k.replace('q_', ''), answer: raw.name, fileUrl: url, storagePath: storedPath });
        } catch (e) {
          console.error('File upload failed', e);
          resolvedResponses.push({ questionId: k.replace('q_', ''), answer: raw.name });
        }
      } else if (Array.isArray(raw)) {
        resolvedResponses.push({ questionId: k.replace('q_', ''), answer: raw });
      } else if (raw && raw.file) {
        // support antd Upload fileList item
        const fileObj: any = raw.file.originFileObj || raw.file;
        if (fileObj instanceof File) {
          try {
            const path = `uploads/${Date.now()}_${fileObj.name}`;
            const { url, path: storedPath } = await storageService.uploadFileWithProgress(path, fileObj, (pct) => {
              setUploadProgress(prev => ({ ...prev, [k]: pct }));
            });
            resolvedResponses.push({ questionId: k.replace('q_', ''), answer: fileObj.name, fileUrl: url, storagePath: storedPath });
          } catch (e) {
            console.error('File upload failed', e);
            resolvedResponses.push({ questionId: k.replace('q_', ''), answer: fileObj.name });
          }
        } else {
          resolvedResponses.push({ questionId: k.replace('q_', ''), answer: String(raw) });
        }
      } else if (raw && raw.fileUrl && raw.storagePath) {
        // already uploaded via beforeUpload
        resolvedResponses.push({ questionId: k.replace('q_', ''), answer: raw.name || raw.fileName || 'file', fileUrl: raw.fileUrl, storagePath: raw.storagePath });
      } else {
        resolvedResponses.push({ questionId: k.replace('q_', ''), answer: raw });
      }
    }

    const cartItem = {
      id,
      programId: program.id,
      programName: program.name,
      programSeasonId: (program as any).seasonId || (program as any).season || null,
      athleteId: selectedAthleteId,
      athleteName: athlete ? `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() : null,
      price,
      quantity: 1,
      responses: resolvedResponses,
      // program-level payment plan removed; plans are defined on Season
      // mark item as preview/dummy when coming from preview mode
      preview: !!isPreview,
    };
    try {
      dispatch(addItem(cartItem));
      message.success(isPreview ? 'Preview item added to cart (dummy)' : 'Added to cart');
      // If this was a preview item, ask admin whether to auto-remove or keep it
      if (cartItem.preview) {
          setTimeout(async () => {
            try {
              // delete any uploaded files associated with this cart item
              const pathsToDelete = (resolvedResponses || []).map(r => (r as any).storagePath).filter(Boolean) as string[];
              for (const p of pathsToDelete) {
                try { await storageService.deleteFile(p); } catch (e) { console.error('Failed to delete preview file', e); }
              }
              dispatch(removeItem(id));
              message.info('Preview item removed from cart and uploaded files deleted');
            } catch (e) { console.error('Failed to remove preview item', e); }
          }, 8000);
        }
      if (onClose) onClose();
    } catch (e) {
      console.error('Add to cart failed', e);
    }
  };

  const handleCancel = () => {
    Modal.confirm({
      title: 'Cancel registration',
      content: 'Are you sure you want to cancel? All entered information will be discarded.',
      okText: 'Yes, discard',
      okType: 'danger',
      cancelText: 'Keep editing',
      onOk: async () => {
        // Attempt to remove any uploaded files
        try {
          const allPaths: string[] = Object.values(uploadedPathsRef.current).flat();
          for (const p of allPaths) {
            try { await storageService.deleteFile(p); } catch (err) { console.error('Failed to delete uploaded file on cancel', err); }
          }
        } catch (err) {
          console.error('Error cleaning uploads on cancel', err);
        }
        form.resetFields();
        uploadedPathsRef.current = {};
        setUploadProgress({});
        if (onClose) onClose();
        message.info('Registration discarded');
      }
    });
  };

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: token.colorBgElevated }}>
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: token.colorText }}>{program.name}</Title>
            <Text type="secondary">{program.description}</Text>
            <div style={{ marginTop: 8, fontSize: 13, color: token.colorTextSecondary }}>
              <div>Season: {seasonName || (program as any).season?.name || program.seasonId || '—'}</div>
              <div>
                Birth Date Range: {program.birthDateStart ? dayjs(program.birthDateStart).format('MMM D, YYYY') : '—'} to {program.birthDateEnd ? dayjs(program.birthDateEnd).format('MMM D, YYYY') : '—'}
              </div>
              <div>Grade Exemptions: {program.allowGradeExemption ? 'Enabled' : 'Disabled'}</div>
              {program.maxGrade !== undefined && (
                <div>Max Grade: {program.maxGrade === 0 ? 'K' : program.maxGrade}</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 8 }}>
              <Button type="link" onClick={() => {
                const sex = (program as any).sport === 'softball' ? 'female' : 'male';
                navigate(`/registration-help?sex=${sex}`);
              }}>Registration Help</Button>
            </div>
            {program.maxParticipants && (
              <div style={{ marginTop: 8 }}>
                <Text strong>Limit</Text>
                <div><Text>{program.currentRegistrants || 0} / {program.maxParticipants}</Text></div>
              </div>
            )}
            {((program as any).private) && <div style={{ marginTop: 8 }}><Tag color="gold">Invite Only</Tag></div>}
          </div>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ paymentMethod: defaultPaymentMethodId || 'new' }}
          onValuesChange={(_, all) => updateFormValid(all)}
          onFieldsChange={(_, all) => updateFormValid(all)}
        >
          {/* Athlete summary + selection (read-only in preview) */}
          <div style={{ marginBottom: 16, padding: 12, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
            <Text strong>Athlete</Text>
            <div style={{ marginTop: 8 }}>
              {familyMembers.length > 0 ? (
                // In preview mode show a read-only summary (name + dob + season age). Otherwise allow selection.
                isPreview ? (
                  (() => {
                    const athlete = familyMembers.find(m => m.id === selectedAthleteId) || familyMembers[0];
                    const dob = athlete?.dateOfBirth;
                    const dobFormatted = dob ? dayjs(dob).format('MMM D, YYYY') : '—';
                    // Determine season cutoff consistent with Registration Help logic
                    const cutoffDate = getSeasonControlDate();
                    let seasonAge = null as number | null;
                    if (dob) {
                      const birth = dayjs(dob);
                      let age = cutoffDate.year() - birth.year();
                      if (cutoffDate.month() < birth.month() || (cutoffDate.month() === birth.month() && cutoffDate.date() < birth.date())) {
                        age--;
                      }
                      seasonAge = age;
                    }
                    const explicitGrade = athlete?.grade;
                    const computedGrade = calculateCurrentGrade(athlete?.graduationYear, cutoffDate);
                    return (
                      <div>
                        <div style={{ fontWeight: 600 }}>{athlete.firstName} {athlete.lastName}</div>
                        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>DOB: {dobFormatted}</div>
                        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>Season Age: {seasonAge !== null ? seasonAge : '—'}</div>
                        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>Grade: {explicitGrade !== undefined && explicitGrade !== null ? (explicitGrade === 0 ? 'K' : explicitGrade) : (computedGrade !== null ? (computedGrade === 0 ? 'K' : computedGrade) : '—')}</div>
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <Select value={selectedAthleteId || undefined} onChange={(v) => setSelectedAthleteId(v)} disabled={isPreview} style={{ width: 300 }}>
                      {familyMembers.filter(m => m.roles?.includes('athlete')).map(a => (
                        <Select.Option key={a.id} value={a.id}>{a.firstName} {a.lastName}</Select.Option>
                      ))}
                    </Select>
                    {selectedAthleteId && (() => {
                      const athlete = familyMembers.find(m => m.id === selectedAthleteId);
                      const dob = athlete?.dateOfBirth;
                      const dobFormatted = dob ? dayjs(dob).format('MMM D, YYYY') : '—';
                      const cutoffDate = getSeasonControlDate();
                      let seasonAge = null as number | null;
                      if (dob) {
                        const birth = dayjs(dob);
                        let age = cutoffDate.year() - birth.year();
                        if (cutoffDate.month() < birth.month() || (cutoffDate.month() === birth.month() && cutoffDate.date() < birth.date())) {
                          age--;
                        }
                        seasonAge = age;
                      }
                      return (
                        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextSecondary }}>
                          <div>DOB: {dobFormatted}</div>
                          <div>Season Age: {seasonAge !== null ? seasonAge : '—'}</div>
                        </div>
                      );
                    })()}
                  </>
                )
              ) : (
                <Text type="secondary">No athlete selected</Text>
              )}
            </div>
          </div>

          {/* Program questions */}
          {program.questions && program.questions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>Additional Information</Title>
              {program.questions.sort((a,b)=>a.order-b.order).map(q => {
                const rules: any[] = [];
                if (q.required) rules.push({ required: true, message: 'This field is required' });
                if (q.type === 'numeric') {
                  rules.push({
                    validator: async (_: any, value: any) => {
                      if (value === null || value === undefined || value === '') {
                        if (q.required) return Promise.reject(new Error('Please enter a number'));
                        return Promise.resolve();
                      }
                      const num = Number(value);
                      if (!Number.isInteger(num)) return Promise.reject(new Error('Value must be an integer'));
                      const MIN = 0;
                      const MAX = 2147483647;
                      if (num < MIN || num > MAX) return Promise.reject(new Error(`Value must be between ${MIN} and ${MAX}`));
                      return Promise.resolve();
                    }
                  });
                }
                if (q.type === 'jersey_number') {
                  rules.push({
                    validator: async (_: any, value: any) => {
                      if (value === null || value === undefined || value === '') {
                        if (q.required) return Promise.reject(new Error('Please enter a jersey number'));
                        return Promise.resolve();
                      }
                      // Accept '00' or '0' or 1-2 digit numbers, allow leading zeroes like '07'
                      const str = String(value).trim();
                      if (!/^\d{1,2}$/.test(str)) return Promise.reject(new Error('Enter 0–99 (00 allowed)'));
                      const num = Number(str);
                      if (!Number.isInteger(num) || num < 0 || num > 99) return Promise.reject(new Error('Value must be between 0 and 99'));
                      return Promise.resolve();
                    }
                  });
                }

                return (
                  <Form.Item key={q.id} name={`q_${q.id}`} label={q.title} rules={rules} extra={q.type === 'numeric' ? 'Enter a positive integer.' : undefined}>
                    {q.type === 'short_answer' && <Input />}
                    {q.type === 'paragraph' && <Input.TextArea rows={3} />}
                    {q.type === 'numeric' && (
                      <InputNumber
                        style={{ width: '100%' }}
                        step={1}
                        onKeyDown={(e) => {
                          const allowed = ['Backspace','Tab','ArrowLeft','ArrowRight','Delete','Home','End'];
                          if (allowed.includes(e.key)) return;
                          // allow ctrl/cmd combos
                          if (e.ctrlKey || e.metaKey) return;
                          // only allow digits
                          if (!/^[0-9]$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                          const text = e.clipboardData.getData('text');
                          if (!/^[0-9]+$/.test(text)) {
                            e.preventDefault();
                          }
                        }}
                      />
                    )}
                    {q.type === 'jersey_number' && (
                      <Input
                        maxLength={2}
                        placeholder="0-99 (00 allowed)"
                        inputMode="numeric"
                        onKeyDown={(e) => {
                          const allowed = ['Backspace','Tab','ArrowLeft','ArrowRight','Delete','Home','End'];
                          if (allowed.includes(e.key)) return;
                          if (e.ctrlKey || e.metaKey) return;
                          // allow digits only
                          if (!/^[0-9]$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                          const text = e.clipboardData.getData('text');
                          if (!/^[0-9]{1,2}$/.test(text)) {
                            e.preventDefault();
                          }
                        }}
                      />
                    )}
                    {q.type === 'dropdown' && <Select options={(q.options||[]).map(o=>({label:o,value:o}))} />}
                    {q.type === 'checkboxes' && (
                      <Checkbox.Group options={(q.options||[])} />
                    )}
                    {q.type === 'file_upload' && (
                      <div>
                        <Upload
                          beforeUpload={(file) => {
                            const name = file.name || '';
                            const lower = name.toLowerCase();
                            const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

                            // Reject common hidden/system files and names starting with a dot
                            if (lower === 'desktop.ini' || lower === '.ds_store' || name.startsWith('.')) {
                              message.error('Hidden or unsupported file. Upload skipped.');
                              return Upload.LIST_IGNORE;
                            }

                            // Reject files larger than 20 MB
                            if (file.size > MAX_BYTES) {
                              message.error('File is too large. Maximum allowed size is 20 MB.');
                              return Upload.LIST_IGNORE;
                            }

                            // upload immediately with progress
                            const qKey = `q_${q.id}`;
                            setUploadProgress(prev => ({ ...prev, [qKey]: 0 }));
                            const path = `uploads/${Date.now()}_${file.name}`;
                            storageService.uploadFileWithProgress(path, file, (pct) => {
                              setUploadProgress(prev => ({ ...prev, [qKey]: pct }));
                            }).then(({ url, path: storedPath }) => {
                              form.setFieldsValue({ [qKey]: { name: file.name, fileUrl: url, storagePath: storedPath } });
                              uploadedPathsRef.current[qKey] = uploadedPathsRef.current[qKey] || [];
                              uploadedPathsRef.current[qKey].push(storedPath);
                              message.success(`${file.name} uploaded`);
                            }).catch((err) => {
                              console.error('Upload failed', err);
                              message.error('File upload failed');
                            });
                            return false; // prevent default upload behavior
                          }}
                          showUploadList={false}
                          onRemove={() => {
                            form.setFieldsValue({ [`q_${q.id}`]: undefined });
                          }}
                          maxCount={1}
                        >
                          <Button>Upload File</Button>
                        </Upload>
                        {uploadProgress[`q_${q.id}`] !== undefined && (
                          <div style={{ marginTop: 8 }}>
                            <Progress percent={uploadProgress[`q_${q.id}`]} size="small" />
                          </div>
                        )}
                      </div>
                    )}
                    {q.type === 'waiver' && (
                      <Checkbox />
                    )}
                  </Form.Item>
                );
              })}
            </div>
          )}

          {/* Footer area: Base Amount on its own row, buttons on a separate row */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 12, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text strong>Base Amount</Text>
              <div><Text>${(program.basePrice || 0).toFixed(2)}</Text></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {!isPreview && (
                  <Button htmlType="button" onClick={handleCancel} icon={<CloseOutlined />}>Cancel</Button>
                )}
                <Button type="primary" htmlType="submit" disabled={!formValid}>Add to Cart</Button>
            </div>
          </div>
        </Form>

      </div>
    </div>
  );
}
