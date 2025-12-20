import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Select,
  Tag,
  Typography,
  Space,
  App,
  Empty,
} from 'antd';
import {
  FormOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import { peopleService } from '../services/firebasePeople';
import { programRegistrationsService } from '../services/firebaseProgramRegistrations';
import { programsService } from '../services/firebasePrograms';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function MyRegistrations() {
  const { message } = App.useApp();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [familyRegistrations, setFamilyRegistrations] = useState<any[]>([]);
  const [programsMap, setProgramsMap] = useState<Record<string, string>>({});
  const [filterAthlete, setFilterAthlete] = useState<string | undefined>(undefined);
  const [filterProgram, setFilterProgram] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [loading, setLoading] = useState(true);
  const [, setCurrentUserFamilyId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allPeople = await peopleService.getPeople();
      const userPerson = allPeople.find(p => p.userId === user?.uid);
      
      if (userPerson?.familyId) {
        setCurrentUserFamilyId(userPerson.familyId);
        const family = await peopleService.getPeopleByFamily(userPerson.familyId);
        setFamilyMembers(family);

        const [regs, progs] = await Promise.all([
          programRegistrationsService.getProgramRegistrationsByFamily(userPerson.familyId),
          programsService.getPrograms(),
        ]);
        
        setFamilyRegistrations(regs || []);
        const map: Record<string, string> = {};
        (progs || []).forEach((p: any) => {
          if (p.id) map[p.id] = p.name || p.id;
        });
        setProgramsMap(map);
      }
    } catch (error) {
      console.error('❌ Error loading registrations:', error);
      message.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'cancelled':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  const filtered = familyRegistrations.filter((reg) => {
    if (filterAthlete && reg.athleteId !== filterAthlete) return false;
    if (filterProgram && reg.programId !== filterProgram) return false;
    if (filterStatus && ((reg.status || 'pending') !== filterStatus)) return false;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <FormOutlined />
            <span>Program Registrations</span>
          </Space>
        }
        loading={loading}
      >
        <div style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select
            allowClear
            placeholder="Filter by athlete"
            style={{ minWidth: 200 }}
            value={filterAthlete}
            onChange={(v) => {
              setFilterAthlete(v);
              setPage(1);
            }}
          >
            {familyMembers.map(m => (
              <Select.Option key={m.id} value={m.id}>
                {`${m.firstName} ${m.lastName}`.trim()}
              </Select.Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Filter by program"
            style={{ minWidth: 240 }}
            value={filterProgram}
            onChange={(v) => {
              setFilterProgram(v);
              setPage(1);
            }}
          >
            {Object.entries(programsMap).map(([id, name]) => (
              <Select.Option key={id} value={id}>
                {name}
              </Select.Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Filter by status"
            style={{ minWidth: 160 }}
            value={filterStatus}
            onChange={(v) => {
              setFilterStatus(v);
              setPage(1);
            }}
          >
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="confirmed">Confirmed</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
          </Select>
        </div>

        {familyRegistrations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size="small">
                <Text type="secondary">No registrations found</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Register your family members for programs to see them here
                </Text>
              </Space>
            }
          />
        ) : pageItems.length === 0 ? (
          <Text type="secondary">No registrations match your filters.</Text>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pageItems.map((reg) => {
                const athleteName = familyMembers.find(m => m.id === reg.athleteId);
                const displayName = athleteName
                  ? `${athleteName.firstName} ${athleteName.lastName}`.trim()
                  : 'Unknown Athlete';
                const programName = programsMap[reg.programId] || 'Unknown Program';
                const status = reg.status || 'pending';

                return (
                  <Card
                    key={reg.id}
                    size="small"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/register/${reg.programId}`)}
                    hoverable
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ marginBottom: 4 }}>
                          <Text strong>{programName}</Text>
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <Text type="secondary">Athlete: {displayName}</Text>
                        </div>
                        {reg.registrationDate && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Registered: {dayjs(reg.registrationDate).format('MMM D, YYYY')}
                            </Text>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <Tag
                          icon={getStatusIcon(status)}
                          color={getStatusColor(status)}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Tag>
                        {reg.totalAmount !== undefined && (
                          <Text strong style={{ fontSize: 16 }}>
                            ${reg.totalAmount.toFixed(2)}
                          </Text>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {total > pageSize && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Space>
                  <Text type="secondary">
                    Showing {start + 1}-{Math.min(start + pageSize, total)} of {total}
                  </Text>
                  {page > 1 && (
                    <a onClick={() => setPage(page - 1)}>Previous</a>
                  )}
                  {start + pageSize < total && (
                    <a onClick={() => setPage(page + 1)}>Next</a>
                  )}
                </Space>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
