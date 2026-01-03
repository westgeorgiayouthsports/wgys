import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card,
  Button,
  Space,
  Typography,
  Table,
  Select,
  Tag,
  Modal,
  Form,
  Input,
  Row,
  Col,
  App,
} from 'antd';
import { PlusOutlined, ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import AdminPageHeader from '../components/AdminPageHeader';
import type { RootState } from '../store/store';
import type { Program } from '../types';
import { programsService } from '../services/firebasePrograms';
import { seasonsService } from '../services/firebaseSeasons';
import { programRegistrationsService } from '../services/firebaseProgramRegistrations';
import { teamsService } from '../services/firebaseTeams';

const { Title, Text } = Typography;

export default function ProgramTeams() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { role } = useSelector((state: RootState) => state.auth);
  const { message } = App.useApp();

  const [program, setProgram] = useState<Program | null>(null);

  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [unassignedTeams, setUnassignedTeams] = useState<any[]>([]);
  const [selectedUnassignedTeam, setSelectedUnassignedTeam] = useState<string | undefined>(undefined);
  const [createTeamVisible, setCreateTeamVisible] = useState(false);
  const [createTeamForm] = Form.useForm();

  useEffect(() => {
    if (programId) {
      loadProgram();
      loadTeamAssignment();
      loadProgramsAndSeasons();
      loadUnassignedTeams();
    }
  }, [programId]);

  const loadUnassignedTeams = async () => {
    try {
      const all = await teamsService.getTeams();
      const unassigned = (all || []).filter((t: any) => !t.programId);
      setUnassignedTeams(unassigned);
    } catch (error) {
      console.error('❌ Error loading unassigned teams:', error);
    }
  };

  const loadProgramsAndSeasons = async () => {
    try {
      const [, seas] = await Promise.all([programsService.getPrograms(), seasonsService.getSeasons()]);
      setSeasons(seas || []);
    } catch (error) {
      console.error('❌ Error loading programs/seasons:', error);
    }
  };

  const getSeasonNameFromProgram = (prog: any) => {
    if (!prog) return '';
    if (prog.season && typeof prog.season === 'object' && prog.season.name) return prog.season.name;
    const sid = prog.seasonId || (typeof prog.season === 'string' ? prog.season : undefined);
    const found = seasons.find((s: any) => s.id === sid);
    return found?.name || sid || '';
  };

  const loadProgram = async () => {
    setLoading(true);
    try {
      const programs = await programsService.getPrograms();
      const foundProgram = programs.find(p => p.id === programId) || null;
      setProgram(foundProgram);
      if (!foundProgram) {
        message.error('Program not found');
      }
    } catch (error) {
      console.error('❌ Error loading program:', error);
      message.error('Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamAssignment = async () => {
    if (!programId) return;
    setAssignmentLoading(true);
    try {
      const [regs, tms] = await Promise.all([
        programRegistrationsService.getProgramRegistrationsByProgram(programId),
        teamsService.getTeamsByProgram(programId),
      ]);
      setRegistrations(regs || []);
      setTeams(tms || []);
    } catch (error) {
      console.error('❌ Error loading team assignment data:', error);
      message.error('Failed to load team assignment data');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const getAssignedTeamId = (athleteId: string) => {
    for (const t of teams) {
      const roster = t.rosterAthleteIds || [];
      if (roster.includes(athleteId)) return t.id;
    }
    return undefined;
  };

  const handleAssignAthlete = async (athleteId: string, teamId?: string) => {
    try {
      if (!teamId) return;
      const team = await teamsService.getTeamById(teamId);
      if (!team) return;
      const roster = Array.from(new Set([...(team.rosterAthleteIds || []), athleteId]));
      await teamsService.updateTeam(teamId, { rosterAthleteIds: roster });
      await loadTeamAssignment();
      message.success('Athlete assigned to team');
    } catch (error) {
      console.error('❌ Error assigning athlete:', error);
      message.error('Failed to assign athlete');
    }
  };

  const handleCreateTeam = async (values: any) => {
    try {
      if (!program) return;
      const newTeam = await teamsService.createTeam({
        name: values.name,
        budget: 0,
        spent: 0,
        status: 'active',
        // derive program/season/year from current program context
        programId: program.id,
        seasonId: (program as any).seasonId || (program as any).season?.id || undefined,
        year: program.year,
        ageGroup: program.ageGroup,
      } as any);
      setCreateTeamVisible(false);
      createTeamForm.resetFields();
      setTeams([...teams, newTeam]);
      message.success('Team created');
    } catch (error) {
      console.error('❌ Error creating team:', error);
      message.error('Failed to create team');
    }
  };

  if (role !== 'admin' && role !== 'owner') {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Title level={2} type="danger">Access Denied</Title>
        <Text type="secondary">You need admin or owner privileges to access this page.</Text>
      </div>
    );
  }

  if (loading || !program) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page-container">
      <AdminPageHeader
        title={<>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/programs')}>Back to Programs</Button>
            <div>
              <Title level={2} style={{ margin: 0 }}>{((program as any)?.season?.name ? `${(program as any).season.name} - ` : '') + program.name}</Title>
              <Text type="secondary">Team Assignment</Text>
            </div>
          </div>
        </>}
        actions={<Button onClick={() => navigate(`/admin/programs/${program.id}`)}>Program Details</Button>}
      />

      <Card title="Team Assignment">
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateTeamVisible(true)}>Create Team</Button>
            <Select
              style={{ width: 260 }}
              placeholder="Assign existing team to this program"
              value={selectedUnassignedTeam}
              onChange={(v) => setSelectedUnassignedTeam(v)}
              options={unassignedTeams.map(t => ({ label: t.name || t.id, value: t.id }))}
              allowClear
            />
            <Button
              onClick={async () => {
                if (!selectedUnassignedTeam || !program) return;
                try {
                  await teamsService.updateTeam(selectedUnassignedTeam, {
                    programId: program.id,
                    seasonId: (program as any).seasonId || (program as any).season?.id || undefined,
                    year: program.year,
                    ageGroup: program.ageGroup,
                  });
                  message.success('Team assigned to program');
                  setSelectedUnassignedTeam(undefined);
                  await loadTeamAssignment();
                  await loadUnassignedTeams();
                } catch (err) {
                  console.error('❌ Error assigning team:', err);
                  message.error('Failed to assign team');
                }
              }}
            >Assign</Button>
            <Button icon={<ReloadOutlined />} onClick={() => { loadTeamAssignment(); loadUnassignedTeams(); }} loading={assignmentLoading}>Refresh</Button>
          </Space>
          <Row gutter={16}>
            <Col xs={24} xl={12}>
              <Card size="small" title={`Teams (${teams.length})`}>
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={teams}
                  pagination={false}
                  scroll={{ x: true }}
                  columns={[
                    { title: 'Name', dataIndex: 'name', key: 'name' },
                    { title: 'Roster', key: 'roster', render: (t: any) => (t.rosterAthleteIds?.length || 0) },
                    { title: 'Staff', key: 'staff', render: (t: any) => (
                      <Space wrap>
                        <Tag color={t.coachId ? 'green' : 'default'}>Head Coach{t.coachId ? '' : ': none'}</Tag>
                        <Tag color={t.teamManagerId ? 'blue' : 'default'}>Manager{t.teamManagerId ? '' : ': none'}</Tag>
                        <Tag color={(t.assistantCoachIds?.length || 0) > 0 ? 'purple' : 'default'}>
                          Assistants: {t.assistantCoachIds?.length || 0}
                        </Tag>
                      </Space>
                    ) },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card size="small" title="Eligible Athletes">
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={(registrations || []).filter(r => (r.status || 'pending') === 'confirmed')}
                  pagination={false}
                  scroll={{ x: true }}
                  columns={[
                    { title: 'Athlete', key: 'athlete', render: (r: any) => r.playerName || r.athleteId },
                    { title: 'Program', dataIndex: 'programName', key: 'programName' },
                    { title: 'Assigned Team', key: 'assigned', render: (r: any) => {
                      const assignedId = r.athleteId ? getAssignedTeamId(r.athleteId) : undefined;
                      const assignedName = teams.find(t => t.id === assignedId)?.name;
                      return (
                        <Tag color={assignedName ? 'blue' : 'default'}>
                          {assignedName ? assignedName : 'Unassigned'}
                        </Tag>
                      );
                    } },
                    { title: 'Status', key: 'status', render: (r: any) => {
                      const assignedId = r.athleteId ? getAssignedTeamId(r.athleteId) : undefined;
                      return (
                        <Tag color={assignedId ? 'green' : 'orange'}>
                          {assignedId ? 'Assigned' : 'Unassigned'}
                        </Tag>
                      );
                    } },
                    { title: 'Assign', key: 'assign', render: (r: any) => (
                      <Select
                        size="small"
                        placeholder="Select team"
                        style={{ width: 180 }}
                        onChange={(value) => handleAssignAthlete(r.athleteId, value)}
                        value={getAssignedTeamId(r.athleteId)}
                      >
                        {teams.map(t => (
                          <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                        ))}
                      </Select>
                    ) },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        <Modal
          title="Create Team"
          open={createTeamVisible}
          onCancel={() => { setCreateTeamVisible(false); createTeamForm.resetFields(); }}
          footer={null}
          width={500}
        >
          <Form form={createTeamForm} layout="vertical" onFinish={handleCreateTeam}>
            <Form.Item name="name" label="Team Name" rules={[{ required: true }]}>
              <Input placeholder="Enter team name" />
            </Form.Item>
            <Form.Item label="Season">
              <Input value={getSeasonNameFromProgram(program)} disabled />
            </Form.Item>
            <Form.Item label="Program">
              <Input value={program.name} disabled />
            </Form.Item>
            <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => { setCreateTeamVisible(false); createTeamForm.resetFields(); }}>Cancel</Button>
                <Button type="primary" htmlType="submit">Create</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
    </div>
  );
}
