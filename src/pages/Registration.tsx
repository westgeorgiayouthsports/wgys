import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Radio,
  Upload,
  Tag,
  theme,
  App,
} from 'antd';
import { InboxOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RootState } from '../store/store';
import { programsService } from '../services/firebasePrograms';
import { programRegistrationsService } from '../services/firebaseProgramRegistrations';
import { storageService } from '../services/storageService';
import { peopleService } from '../services/firebasePeople';
import { mailQueue } from '../services/firebaseMailQueue';
import { paymentMethodsService, type PaymentMethod } from '../services/firebasePaymentMethods';
import type { Program } from '../types/program';

const { Title, Text } = Typography;

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { programId } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const { token } = theme.useToken();
  const { modal } = App.useApp();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [modalProgram, setModalProgram] = useState<Program | null>(null);
  const [form] = Form.useForm();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [parentInfo, setParentInfo] = useState<{ name: string; email: string; phone: string } | null>(null);
  const { Dragger } = Upload;
  const [registrationsMap, setRegistrationsMap] = useState<Record<string, any[]>>({});
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'plan'>('full');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    loadPrograms();
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    if (programId && programs.length > 0) {
      const p = programs.find((x) => x.id === programId);
      if (p) {
        // Check for athleteId query param - only auto-open modal if athlete is specified
        const params = new URLSearchParams(window.location.search);
        const queryAthleteId = params.get('athleteId');
        if (queryAthleteId) {
          setModalProgram(p);
          setSelectedAthleteId(queryAthleteId);
        }
        // If no athleteId, user will see the program list and can click Register
      }
    }
  }, [programId, programs]);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const person = await peopleService.getPersonByUserId(user.uid);
        if (person && person.familyId) {
          const members = await peopleService.getPeopleByFamily(person.familyId);
          setFamilyMembers(members || []);
          
          // Set parent info from logged-in user
          setParentInfo({
            name: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
            email: user.email || '',
            phone: person.phone || '',
          });
          
          // load registrations for family
          try {
            const regs = await programRegistrationsService.getProgramRegistrationsByFamily(person.familyId);
            const map: Record<string, any[]> = {};
            regs.forEach((r) => {
              if (r.athleteId) {
                map[r.athleteId] = map[r.athleteId] || [];
                map[r.athleteId].push(r);
              }
            });
            setRegistrationsMap(map);
          } catch (e) {
            console.error('Error loading registrations for family', e);
          }
        }
      } catch (err) {
        console.error('Error loading family members', err);
      }
    })();
  }, [user]);

  const loadPrograms = async () => {
    try {
      const list = await programsService.getPrograms();
      const active = list.filter((p) => p.active);
      setPrograms(active);
    } catch (err) {
      console.error('Failed to load programs', err);
      message.error('Failed to load programs');
    }
  };

  const loadPaymentMethods = async () => {
    if (!user?.uid) return;
    try {
      const methods = await paymentMethodsService.getPaymentMethodsByUser(user.uid);
      setSavedCards(methods);
    } catch (err) {
      console.error('Failed to load payment methods', err);
    }
  };

  const openRegister = (program: Program, athleteId?: string) => {
    setModalProgram(program);
    form.resetFields();
    setPaymentPlan('full');
    
    // Set default payment method to default card or first saved card if available
    const defaultCard = savedCards.find(c => c.isDefault) || savedCards[0];
    if (defaultCard) {
      setSelectedPaymentMethod(defaultCard.id);
      form.setFieldsValue({ paymentMethod: defaultCard.id });
    } else {
      setSelectedPaymentMethod('new');
      form.setFieldsValue({ paymentMethod: 'new' });
    }
    
    // Pre-fill parent information from logged-in user
    if (parentInfo) {
      form.setFieldsValue({
        parentName: parentInfo.name,
        parentEmail: parentInfo.email,
        phone: parentInfo.phone,
      });
    }

    // prefill athlete from query param or provided athleteId
    const params = new URLSearchParams(window.location.search);
    const queryAthleteId = params.get('athleteId');
    const useAthleteId = athleteId || queryAthleteId;
    if (useAthleteId) {
      setSelectedAthleteId(useAthleteId);
      (async () => {
        try {
          const person = await peopleService.getPersonById(useAthleteId as string);
          if (person) {
            form.setFieldsValue({
              firstName: person.firstName || (person.firstName ? person.firstName : ''),
              lastName: person.lastName || (person.lastName ? person.lastName : ''),
              dob: person.dateOfBirth ? dayjs(person.dateOfBirth) : undefined,
              sex: person.sex,
              athleteSelect: person.id,
            });
          }
        } catch (err) {
          console.error('Error prefilling athlete', err);
        }
      })();
    }
  };

  const validateEligibility = (program: Program, dob: any, sex: string) => {
    if (!dob) return { ok: false, reason: 'Please enter child date of birth' };
    const birth = dayjs(dob);
    if (program.birthDateStart) {
      const start = dayjs(program.birthDateStart);
      if (birth.isBefore(start, 'day')) return { ok: false, reason: 'Child is too old for this program' };
    }
    if (program.birthDateEnd) {
      const end = dayjs(program.birthDateEnd);
      if (birth.isAfter(end, 'day')) return { ok: false, reason: 'Child is too young for this program' };
    }
    if (program.sexRestriction === 'female') {
      if (sex !== 'female') return { ok: false, reason: 'Program is for females only' };
    }
    return { ok: true };
  };

  const handleSubmit = async (values: any) => {
    if (!modalProgram || !selectedAthleteId || !parentInfo) return;

    try {
      const selectedAthlete = familyMembers.find(m => m.id === selectedAthleteId);
      const playerName = selectedAthlete ? `${selectedAthlete.firstName} ${selectedAthlete.lastName}`.trim() : '';
      const fee = modalProgram.basePrice || 0;
      
      // Determine payment method to store - use Stripe PM ID if saved card selected
      let paymentMethodToStore = values.paymentMethod || 'other';
      const selectedCard = savedCards.find(c => c.id === selectedPaymentMethod);
      if (selectedCard && selectedCard.stripePaymentMethodId) {
        paymentMethodToStore = selectedCard.stripePaymentMethodId;
      }

      // Collect all custom registration questions and answers
      const responses: any[] = [];
      for (const key of Object.keys(values)) {
        if (key.startsWith('q_')) {
          const qId = key.replace('q_', '');
          const qVal = values[key];
          responses.push({ questionId: qId, answer: qVal });
        }
      }

      // Get family ID from selected athlete
      const selectedAthleteData = await peopleService.getPersonById(selectedAthleteId);
      const familyId = selectedAthleteData?.familyId;

      // Create registration with all data
      const created = await programRegistrationsService.createProgramRegistration(
        modalProgram.id,
        user?.uid || 'anonymous',
        responses,
        fee,
        paymentMethodToStore,
        selectedAthleteId,
        familyId,
        paymentPlan, // Add payment plan to registration
        {
          programName: modalProgram.name,
          playerName,
          paymentDisplay: (() => {
            // compute a friendly display mirroring confirmation page logic
            if (selectedCard) {
              const brand = (selectedCard.brand || '').toUpperCase();
              const last4 = selectedCard.last4 || '';
              return `${brand} **** ${last4}`.trim();
            }
            if (paymentMethodToStore === 'stripe') return 'Stripe';
            if (paymentMethodToStore === 'other') return 'Other';
            return paymentMethodToStore;
          })()
        }
      );

      // Send confirmation email to parent using logged-in user's email
      const mailHtml = `<p>Thank you for registering ${playerName} for ${modalProgram.name}.</p><p>Fee: $${fee.toFixed(2)}</p><p>Payment Plan: ${paymentPlan === 'full' ? 'Pay in Full' : 'Payment Plan'}</p><p>Payment Method: ${paymentMethodToStore}</p>`;
      if (parentInfo.email) {
        mailQueue.enqueueMail(parentInfo.email, `Registration Confirmation: ${modalProgram.name}`, mailHtml);
      }

      // Handle payment method specific flows
      if (paymentMethodToStore === 'venmo' || paymentMethodToStore === 'cashapp') {
        modal.info({
          title: 'Complete Payment',
          content: (
            <div>
              <p>Please send payment of <b>${fee.toFixed(2)}</b> via {paymentMethodToStore.toUpperCase()} to the account configured by the program organizer.</p>
              <p>After sending, return here and contact the program admin to confirm payment.</p>
            </div>
          ),
        });
      } else if (paymentMethodToStore === 'stripe') {
        modal.info({ 
          title: 'Payment Processing', 
          content: <div>Stripe payment processing would occur here. Registration created as pending.</div> 
        });
      } else {
        modal.success({ 
          title: 'Registration Submitted', 
          content: `Registration for ${playerName} has been submitted. Please follow payment instructions from the program organizer.` 
        });
      }

      setModalProgram(null);
      form.resetFields();
      navigate(`/register/confirmation/${created.id}`);
    } catch (err) {
      console.error('Failed to create registration', err);
      message.error('Failed to create registration');
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Program Registration</Title>
        <Text type="secondary">Register your child for an active program</Text>
      </div>

      {/* Athletes summary: show registered programs and eligible programs per athlete */}
      {familyMembers && familyMembers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={4}>Your Athletes</Title>
          <Row gutter={[16, 16]}>
            {familyMembers.filter(m => m.roles?.includes('athlete')).map((athlete) => {
              const regs = registrationsMap[athlete.id] || [];
              // determine eligible programs
              const eligible = programs.filter((p) => {
                const dob = athlete.dateOfBirth;
                const sex = athlete.sex;
                const elig = validateEligibility(p, dob, sex);
                if (!elig.ok) return false;
                // exclude already registered for same program
                const already = regs.some(r => r.programId === p.id);
                return !already;
              });

              const isSelected = selectedAthleteId === athlete.id;

              return (
                <Col xs={24} sm={12} md={8} key={athlete.id}>
                  <Card
                    size="small"
                    title={`${athlete.firstName} ${athlete.lastName}`}
                    style={isSelected ? { borderColor: '#1890ff' } : undefined}
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    hoverable
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary">Age: {athlete.dateOfBirth ? dayjs().diff(dayjs(athlete.dateOfBirth), 'year') : '—'}</Text>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>Registered</Text>
                      <div>
                        {regs.length === 0 && <div><Text type="secondary">No registrations</Text></div>}
                        {regs.map((r) => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                            <div>{programs.find(p => p.id === r.programId)?.name || r.programId}</div>
                            <div>
                              <Button size="small" onClick={() => navigate(`/register/confirmation/${r.id}`)}>View</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Text strong>Eligible Programs</Text>
                      <div>
                        {eligible.length === 0 && <div><Text type="secondary">No eligible programs</Text></div>}
                        {eligible.map((p) => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                            <div>{p.name}</div>
                            <div>
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => { setSelectedAthleteId(athlete.id); openRegister(p, athlete.id); }}
                                disabled={!isSelected}
                              >
                                Register
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      <Row gutter={[16, 16]}>
        {programs.map((p) => (
          <Col xs={24} sm={12} md={8} key={p.id}>
            <Card size="small" title={p.name} extra={<Text strong>${(p.basePrice || 0).toFixed(2)}</Text>}>
              {/* Registration Deadline */}
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Last Day: {dayjs(p.registrationEnd).format('MMM D, YYYY')}</Text>
              </div>

              {/* Requirements Section */}
              <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                <Text strong style={{ fontSize: '12px', color: '#666' }}>REQUIREMENTS</Text>
                <div style={{ marginTop: 6 }}>
                  {/* Sex Restriction */}
                  {p.sexRestriction === 'female' && (
                    <div style={{ marginBottom: 4 }}>
                      <Tag color="magenta">
                        Female
                      </Tag>
                    </div>
                  )}
                  {p.sexRestriction === 'any' && (
                    <div style={{ marginBottom: 4 }}>
                      <Tag color="default">Any</Tag>
                    </div>
                  )}

                  {/* Age/Birth Date Requirements */}
                  {(p.birthDateStart || p.birthDateEnd) && (
                    <div style={{ marginBottom: 4, fontSize: '12px' }}>
                      <Text type="secondary">
                        Born: {p.birthDateStart ? dayjs(p.birthDateStart).format('MMM YYYY') : '—'} to {p.birthDateEnd ? dayjs(p.birthDateEnd).format('MMM YYYY') : '—'}
                      </Text>
                    </div>
                  )}

                  {/* Grade Requirements */}
                  {p.maxGrade !== undefined && (
                    <div style={{ fontSize: '12px' }}>
                      <Text type="secondary">
                        Up to Grade {p.maxGrade === 0 ? 'K' : p.maxGrade}
                        {p.allowGradeExemption && <Text type="warning"> (exemptions available)</Text>}
                      </Text>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ maxHeight: 100, overflow: 'auto', fontSize: '13px' }} dangerouslySetInnerHTML={{ __html: p.description || 'No description available' }} />
              </div>

              {/* Action Buttons */}
              <Space style={{ marginTop: 12 }}>
                {(() => {
                  const selected = selectedAthleteId ? familyMembers.find(f => f.id === selectedAthleteId) : null;
                  let selectedEligible = false;
                  if (selected) {
                    const elig = validateEligibility(p, selected.dateOfBirth, selected.sex);
                    const already = (registrationsMap[selected.id] || []).some(r => r.programId === p.id);
                    selectedEligible = elig.ok && !already;
                  }
                  return (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => openRegister(p, selectedAthleteId || undefined)}
                      disabled={!selected || !selectedEligible}
                    >
                      Register
                    </Button>
                  );
                })()}
                <Button size="small" onClick={() => navigate(`/programs/${p.id}`)}>Details</Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={modalProgram && selectedAthleteId ? `Register for: ${modalProgram.name}` : 'Select Program'}
        open={!!modalProgram}
        onCancel={() => setModalProgram(null)}
        footer={null}
        width={500}
      >
        {modalProgram && selectedAthleteId && (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* Athlete Summary */}
            <div style={{ marginBottom: 24, padding: '12px', backgroundColor: token.colorBgElevated, borderRadius: token.borderRadius }}>
              {familyMembers.length > 0 && (
                <div>
                  <Text strong>Athlete:</Text> <Text>{familyMembers.find(m => m.id === selectedAthleteId)?.firstName} {familyMembers.find(m => m.id === selectedAthleteId)?.lastName}</Text>
                </div>
              )}
            </div>

            {/* Program questions */}
            {modalProgram.questions && modalProgram.questions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>Additional Information</Title>
                {modalProgram.questions.sort((a,b)=>a.order-b.order).map(q => {
                  if (q.type === 'short_answer' || q.type === 'paragraph') {
                    return (
                      <Form.Item key={q.id} name={`q_${q.id}`} label={q.title} rules={[{ required: q.required }]}>
                        <Input.TextArea rows={q.type === 'paragraph' ? 3 : 1} />
                      </Form.Item>
                    );
                  }
                  if (q.type === 'dropdown') {
                    return (
                      <Form.Item key={q.id} name={`q_${q.id}`} label={q.title} rules={[{ required: q.required }]}>
                        <Select options={(q.options || []).map(o=>({label:o,value:o}))} />
                      </Form.Item>
                    );
                  }
                  if (q.type === 'checkboxes') {
                    return (
                      <Form.Item key={q.id} name={`q_${q.id}`} label={q.title} rules={[{ required: q.required }]}>
                        <Select mode="multiple" options={(q.options || []).map(o=>({label:o,value:o}))} />
                      </Form.Item>
                    );
                  }
                  if (q.type === 'waiver') {
                    return (
                      <Form.Item key={q.id} name={`q_${q.id}`} valuePropName="checked" rules={[{ required: q.required }]}>
                        <Radio>{q.title}</Radio>
                      </Form.Item>
                    );
                  }
                  if (q.type === 'file_upload') {
                    return (
                      <Form.Item key={q.id} name={`q_${q.id}`} label={q.title} rules={[{ required: q.required }]}>
                        <Dragger
                          name="file"
                          multiple={false}
                          showUploadList={false}
                          beforeUpload={async (file: any) => {
                            try {
                              const path = `program_uploads/${modalProgram?.id}/${user?.uid}/${Date.now()}-${file.name}`;
                              const url = await storageService.uploadFile(path, file as File);
                              form.setFieldsValue({ [`q_${q.id}`]: url });
                              message.success(`${file.name} uploaded`);
                            } catch (err) {
                              console.error('Upload error', err);
                              message.error('Upload failed');
                            }
                            return false; // prevent default upload
                          }}
                        >
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                          </p>
                          <p className="ant-upload-text">Click or drag file to this area to upload</p>
                        </Dragger>
                        <Form.Item shouldUpdate>
                          {() => {
                            const val = form.getFieldValue(`q_${q.id}`);
                            return val ? (
                              <div style={{ marginTop: 8 }}>
                                <a href={val} target="_blank" rel="noreferrer">View uploaded file</a>
                              </div>
                            ) : null;
                          }}
                        </Form.Item>
                      </Form.Item>
                    );
                  }
                  // fallback for unknown types
                  return (
                    <Form.Item key={q.id} label={q.title}>
                      <Input disabled placeholder="Question type not supported" />
                    </Form.Item>
                  );
                })}
              </div>
            )}

            {/* Enhanced Payment Bubble */}
            <div style={{ 
              marginBottom: 24, 
              padding: '20px', 
              backgroundColor: token.colorBgElevated, 
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorBorder}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: token.colorPrimary, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <DollarOutlined style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>Payment</Title>
              </div>

              {/* Payment Plan Selection */}
              <div style={{ marginBottom: 20 }}>
                <Text style={{ display: 'block', marginBottom: 12, color: token.colorPrimary }}>Select one:</Text>
                <div style={{ 
                  backgroundColor: token.colorBgContainer, 
                  borderRadius: token.borderRadius,
                  border: `1px solid ${token.colorBorder}`,
                  overflow: 'hidden'
                }}>
                  <div 
                    onClick={() => setPaymentPlan('full')}
                    style={{ 
                      padding: '16px 20px',
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      backgroundColor: paymentPlan === 'full' ? token.colorPrimaryBg : 'transparent',
                      borderBottom: modalProgram.paymentPlanEnabled ? `1px solid ${token.colorBorder}` : 'none',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <Text strong style={{ color: paymentPlan === 'full' ? token.colorPrimary : token.colorText }}>
                      Pay in Full
                    </Text>
                    <Text strong style={{ fontSize: 18, color: paymentPlan === 'full' ? token.colorPrimary : token.colorText }}>
                      ${(modalProgram.basePrice || 0).toFixed(2)}
                    </Text>
                  </div>
                  {modalProgram.paymentPlanEnabled && (
                    <div 
                      onClick={() => setPaymentPlan('plan')}
                      style={{ 
                        padding: '16px 20px',
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        backgroundColor: paymentPlan === 'plan' ? token.colorPrimaryBg : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div>
                        <Text strong style={{ color: paymentPlan === 'plan' ? token.colorPrimary : token.colorText, display: 'block' }}>
                          Payment Plan
                        </Text>
                        {modalProgram.paymentPlanInstallments && modalProgram.paymentPlanFrequency && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {modalProgram.paymentPlanInstallments} {modalProgram.paymentPlanFrequency} payments of ${((modalProgram.basePrice || 0) / modalProgram.paymentPlanInstallments).toFixed(2)}
                          </Text>
                        )}
                      </div>
                      <Text strong style={{ fontSize: 18, color: paymentPlan === 'plan' ? token.colorPrimary : token.colorText }}>
                        ${(modalProgram.basePrice || 0).toFixed(2)}
                      </Text>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>Payment Method</Text>
                <Form.Item 
                  name="paymentMethod" 
                  rules={[{ required: true, message: 'Please select a payment method' }]}
                  style={{ marginBottom: 0 }}
                >
                  <div>
                    {savedCards.length > 0 && savedCards.map(card => (
                      <div 
                        key={card.id}
                        onClick={() => {
                          setSelectedPaymentMethod(card.id);
                          form.setFieldsValue({ paymentMethod: card.id });
                        }}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: selectedPaymentMethod === card.id ? token.colorPrimaryBg : token.colorBgContainer,
                          border: `1px solid ${selectedPaymentMethod === card.id ? token.colorPrimary : token.colorBorder}`,
                          borderRadius: token.borderRadius,
                          marginBottom: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Text strong>{card.brand}</Text>
                          <Text>•••• {card.last4}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Expires {card.expMonth}/{card.expYear}
                          </Text>
                          {card.isDefault && <Tag color="blue">Default</Tag>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Form.Item>
                <Button 
                  type="dashed" 
                  block 
                  onClick={() => navigate('/payment-methods')}
                  style={{ marginTop: 8 }}
                >
                  + Add New Payment Method
                </Button>
              </div>
            </div>

            <Form.Item style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setModalProgram(null)}>Cancel</Button>
                <Button type="primary" htmlType="submit">Complete Registration</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};
