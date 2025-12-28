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

  message,
  Tag,
  theme,
} from 'antd';
import dayjs from 'dayjs';
import calculateCurrentGrade from '../utils/grade';
import calculateAgeAt from '../utils/age';
import type { RootState } from '../store/store';
import { programsService } from '../services/firebasePrograms';
import { programRegistrationsService } from '../services/firebaseProgramRegistrations';
import { seasonsService } from '../services/firebaseSeasons';
import logger from '../utils/logger';
// storageService not required in this page anymore
import { peopleService } from '../services/firebasePeople';
import { paymentMethodsService, type PaymentMethod } from '../services/firebasePaymentMethods';
import type { Program } from '../types/program';
import Register from '../components/Registrations/Register';

const { Title, Text } = Typography;

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { programId } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const { token } = theme.useToken();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [modalProgram, setModalProgram] = useState<Program | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [parentInfo, setParentInfo] = useState<{ name: string; email: string; phone: string } | null>(null);
  // Dragger upload removed; upload handled in Register component
  const [registrationsMap, setRegistrationsMap] = useState<Record<string, any[]>>({});
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
            logger.error('Error loading registrations for family', e);
          }
        }
      } catch (err) {
        logger.error('Error loading family members', err);
      }
    })();
  }, [user]);

  const loadPrograms = async () => {
    try {
      const list = await programsService.getPrograms();
      const active = list.filter((p) => p.active);
      // enrich with current registrant counts to honor maxParticipants limits
      const enriched = await Promise.all(active.map(async (p) => {
        try {
          const regs = await programRegistrationsService.getProgramRegistrationsByProgram(p.id);
          const activeStatuses = ['pending', 'confirmed'];
          const count = regs.filter(r => activeStatuses.includes(r.status)).length;
          return { ...p, currentRegistrants: count };
        } catch {
          return { ...p, currentRegistrants: p.currentRegistrants || 0 };
        }
      }));
      setPrograms(enriched);
    } catch (err) {
      try {
        const s = await seasonsService.getSeasons();
        setSeasons(s || []);
      } catch (e) {
        logger.error('Failed to load seasons:', e);
      }
      logger.error('Failed to load programs', err);
      message.error('Failed to load programs');
    }
  };

  const getSeasonName = (prog: Program | any) => {
    if (!prog) return '';
    if (prog.season && typeof prog.season === 'object' && prog.season.name) return prog.season.name;
    const sid = prog.seasonId || (typeof prog.season === 'string' ? prog.season : undefined);
    const found = seasons.find((s: any) => s.id === sid);
    return found?.name || sid || '';
  };

  const loadPaymentMethods = async () => {
    if (!user?.uid) return;
    try {
      const methods = await paymentMethodsService.getPaymentMethodsByUser(user.uid);
      setSavedCards(methods);
    } catch (err) {
      logger.error('Failed to load payment methods', err);
    }
  };

  // Use shared calculateCurrentGrade; prefer explicitGrade when provided
  const calculateCurrentGradeLocal = (graduationYear?: number, explicitGrade?: number | null) => {
    if (explicitGrade !== undefined && explicitGrade !== null) return explicitGrade;
    return calculateCurrentGrade(graduationYear);
  };

  const openRegister = (program: Program, athleteId?: string) => {
    setModalProgram(program);
    // reset local selection/state managed here; Register component manages its own Form instance
    // Set default payment method to default card or first saved card if available
    const defaultCard = savedCards.find(c => c.isDefault) || savedCards[0];
    if (defaultCard) {
      setSelectedPaymentMethod(defaultCard.id);
    } else {
      setSelectedPaymentMethod('new');
    }

    // prefill athlete from query param or provided athleteId (Register will pick up athleteId prop)
    const params = new URLSearchParams(window.location.search);
    const queryAthleteId = params.get('athleteId');
    const useAthleteId = athleteId || queryAthleteId;
    if (useAthleteId) {
      setSelectedAthleteId(useAthleteId);
    }
  };

  const validateEligibility = (program: Program, dob: any, sex: string) => {
    if (!dob) return { ok: false, reason: 'Please enter child date of birth' };
    const birth = dayjs(dob);
    // Use YYYY-MM-DD string comparison to avoid timezone/time-of-day issues and
    // to ensure equality with the program end date is treated as eligible.
    const birthStr = birth.format('YYYY-MM-DD');
    if (program.birthDateStart) {
      const startStr = dayjs(program.birthDateStart).format('YYYY-MM-DD');
      if (birthStr < startStr) return { ok: false, reason: 'Child is too old for this program' };
    }
    if (program.birthDateEnd) {
      const endStr = dayjs(program.birthDateEnd).format('YYYY-MM-DD');
      if (birthStr > endStr) return { ok: false, reason: 'Child is too young for this program' };
    }
    if (program.sexRestriction === 'female') {
      if (sex !== 'female') return { ok: false, reason: 'Program is for females only' };
    }
    if (program.sexRestriction === 'male') {
      if (sex !== 'male') return { ok: false, reason: 'Program is for males only' };
    }
    return { ok: true };
  };

  // registration creation moved to Cart checkout; no local submit handler

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
                  // enforce maxParticipants if set
                  if (p.maxParticipants !== undefined && (p.currentRegistrants || 0) >= p.maxParticipants) return false;
                  return !already;
              });

              const isSelected = selectedAthleteId === athlete.id;

              // Compute season age when a program context is available (modalProgram or route param),
              // otherwise compute current age as of today.
              const programForDisplay = modalProgram || (programId ? programs.find(p => p.id === programId) : undefined);
              let ageVal = null as number | null;
              if (programForDisplay && programForDisplay.birthDateEnd) {
                ageVal = calculateAgeAt(athlete.dateOfBirth, dayjs(programForDisplay.birthDateEnd));
              } else {
                ageVal = calculateAgeAt(athlete.dateOfBirth);
              }
              const age = ageVal === null ? '—' : ageVal;
              const gradeVal = athlete.grade !== undefined && athlete.grade !== null ? athlete.grade : calculateCurrentGradeLocal(athlete.graduationYear, athlete.grade);
              const gradeDisplay = gradeVal === null ? '—' : (gradeVal === 0 ? 'K' : gradeVal);

              return (
                <Col xs={24} sm={12} md={8} key={athlete.id}>
                  <Card
                    size="small"
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 600 }}>{athlete.firstName} {athlete.lastName}</div>
                        <div style={{ textAlign: 'center', minWidth: 80 }}><Text type="secondary">Age: {age}</Text></div>
                        <div style={{ textAlign: 'right', minWidth: 80 }}><Text type="secondary">Grade: {gradeDisplay}</Text></div>
                      </div>
                    }
                    style={isSelected ? { borderColor: '#1890ff' } : undefined}
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    hoverable
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>Registered</Text>
                      <div>
                        {regs.length === 0 && <div><Text type="secondary">No registrations</Text></div>}
                        {regs.map((r) => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                            <div>{(() => { const p = programs.find(p => p.id === r.programId); return p ? `${getSeasonName(p) ? getSeasonName(p) + ' - ' : ''}${p.name}` : r.programId; })()}</div>
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
            <Card size="small" title={`${getSeasonName(p) ? getSeasonName(p) + ' - ' : ''}${p.name}`} extra={<Text strong>${(p.basePrice || 0).toFixed(2)}</Text>}>
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
                      <Tag color="magenta">Female</Tag>
                    </div>
                  )}
                  {p.sexRestriction === 'male' && (
                    <div style={{ marginBottom: 4 }}>
                      <Tag color="blue">Male</Tag>
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
                      disabled={!selected || !selectedEligible || (p.maxParticipants !== undefined && (p.currentRegistrants || 0) >= p.maxParticipants)}
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


          {/* Render Register full-page when modalProgram is set */}
          {modalProgram && selectedAthleteId && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(0,0,0,0.45)', overflow: 'auto' }}>
              <div style={{ paddingTop: 40 }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', background: token.colorBgElevated }}>
                  <Register
                    program={modalProgram}
                    athleteId={selectedAthleteId}
                    onClose={() => { setModalProgram(null); }}
                    isPreview={false}
                    familyMembers={familyMembers}
                    parentInfo={parentInfo}
                    defaultPaymentMethodId={selectedPaymentMethod}

                  />
                </div>
              </div>
            </div>
          )}
    </div>
  );
};
