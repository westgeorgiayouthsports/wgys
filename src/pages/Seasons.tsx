import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { db } from '../services/firebase';
import { useSelector } from 'react-redux';
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  message,
  Popconfirm,
  Tooltip,
  Tabs,
} from 'antd';
import logger from '../utils/logger';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import AdminPageHeader from '../components/AdminPageHeader';
import type { RootState } from '../store/store';
import { seasonsService } from '../services/firebaseSeasons';
import { programsService } from '../services/firebasePrograms';
import type { Program } from '../types/program';
import type { Season, SeasonFormData } from '../types/season';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import SeasonEditor, { SeasonEditorRef } from '../components/SeasonEditor';
import { getCachedPref } from '../utils/prefs';
import { SeasonStatusValues } from '../types/enums/season';

const { Title, Text } = Typography;
  const seasonColor: Record<Season['seasonType'], string> = {
  spring: 'blue',
  summer: 'green',
  fall: 'orange',
  winter: 'geekblue',
};

const seasonLabel: Record<Season['seasonType'], string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

export default function Seasons() {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(SeasonStatusValues.active);
  const initialSeasonsPageSize = getCachedPref<number>('seasonsPageSize') ?? 15;
  const [pagination, setPagination] = useState({ current: 1, pageSize: initialSeasonsPageSize });
  const [programCountBySeason, setProgramCountBySeason] = useState<Record<string, number>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const editorRef = useRef<SeasonEditorRef>(null);
  // modal form moved into shared SeasonEditor component

  if (role !== 'admin' && role !== 'owner') {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Title level={2} type="danger">Access Denied</Title>
        <Text type="secondary">You need admin or owner privileges to access this page.</Text>
      </div>
    );
  }

  useEffect(() => {
    loadSeasons();
    loadUserPreferences();
  }, []);

  // If caller requested to open a specific season, open the edit modal
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openSeason = params.get('openSeason');
    if (openSeason && seasons.length > 0) {
      const found = seasons.find(s => s.id === openSeason);
      if (found) {
        // slight delay to ensure UI is ready
        setTimeout(() => handleEditSeason(found), 50);
      }
    }
  }, [location.search, seasons]);

  const loadUserPreferences = async () => {
    if (user?.uid) {
      try {
        const userRef = ref(db, `users/${user.uid}/preferences`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const prefs = snapshot.val();
          if (prefs.seasonsPageSize) {
            setPagination(prev => ({ ...prev, pageSize: prefs.seasonsPageSize }));
          }
        }
      } catch (error) {
        logger.error('Failed to load user preferences for seasons:', error);
      }
    }
  };

  const saveUserPreferences = async (pageSize: number) => {
    if (user?.uid) {
      try {
        const userRef = ref(db, `users/${user.uid}/preferences`);
        await update(userRef, { seasonsPageSize: pageSize });
      } catch (error) {
        console.error('Failed to save seasons pageSize preference:', error);
      }
    }
  };

  const loadSeasons = async () => {
    setLoading(true);
    try {
      const seasonsList = await seasonsService.getSeasons();
      const sorted = seasonsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSeasons(sorted);
      // load programs to count assignments per season
      try {
        const programs = await programsService.getPrograms();
        setPrograms(programs || []);
        const counts: Record<string, number> = {};
        (programs || []).forEach((p: any) => {
          const sid = p.seasonId || (p.season && typeof p.season === 'string' ? p.season : undefined);
          if (!sid) return;
          counts[sid] = (counts[sid] || 0) + 1;
        });
        setProgramCountBySeason(counts);
      } catch (e) {
        console.error('Error loading programs for season counts', e);
        setProgramCountBySeason({});
      }
      } catch (error) {
      logger.error('Error loading seasons:', error);
      message.error('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  // navigation now handles opening the season detail route for editing/creating
  const handleEditSeason = (season: Season) => {
    // kept for backward-compat but route navigation preferred
    setEditingSeason(season);
    setModalVisible(true);
  };

  const handleArchiveSeason = async (seasonId: string) => {
    try {
      await seasonsService.archiveSeasonCascade(seasonId, user?.uid || undefined);
      await loadSeasons();
      message.success('Season and all related programs/teams archived');
    } catch (error) {
      logger.error('Error archiving season:', error);
      message.error('Failed to archive season');
    }
  };

  const unlinkProgramFromSeason = async (programId: string) => {
    try {
      await programsService.unlinkProgram(programId);
      message.success('Program unlinked from season');
      await loadSeasons();
      return true;
    } catch (err) {
      logger.error('Error unlinking program from season', err);
      message.error('Failed to unlink program');
      return false;
    }
  };

  const handleDeleteSeason = async (seasonId: string) => {
    try {
      await seasonsService.deleteSeason(seasonId, user?.uid || undefined);
      await loadSeasons();
      // verify deletion actually occurred
      try {
        const still = await seasonsService.getSeasonById(seasonId);
        if (still) {
          logger.error('Delete reported success but season still exists on server', { seasonId, still });
          message.error('Delete reported success but season still exists — check server logs');
          return;
        }
      } catch (verifyErr) {
        logger.error('Error verifying season deletion', verifyErr);
      }

      // ensure UI returns to the main seasons list and modal is closed
      setModalVisible(false);
      setEditingSeason(null);
      navigate('/admin/seasons', { replace: true });
      message.success('Season deleted');
    } catch (error) {
      logger.error('Error deleting season:', error);
      const emsg = (error && (error as any).message) ? (error as any).message : String(error);
      message.error(emsg || 'Failed to delete season');
    }
  };
  // Date handling and form UI moved to `SeasonEditor` to share logic between pages.

  const handleSubmit = async (values: any) => {
    try {
      // Client-side duplicate checks using currently loaded seasons
      const nameNorm = (values.name || '').trim().toLowerCase();
      if (nameNorm) {
        const dup = seasons.find(s => (s.name || '').trim().toLowerCase() === nameNorm && s.id !== editingSeason?.id);
        if (dup) {
          message.error('A season with that name already exists');
          return;
        }
      }
      // determine candidate type/year
      let candidateType = values.seasonType as any;
      let candidateYear = values.year as number | undefined;
      if (!candidateType && values.startDate) {
        const meta = seasonsService.deriveSeasonMeta(values.startDate.format('YYYY-MM-DD'));
        candidateType = meta.type;
        candidateYear = meta.year;
      }
      if (candidateType && candidateYear) {
        const dupTY = seasons.find(s => s.seasonType === candidateType && s.year === candidateYear && s.id !== editingSeason?.id);
          if (dupTY) {
            message.error('A season with that type and year already exists');
          return;
        }
      }
      // normalize date fields to YYYY-MM-DD strings
      const startDate = values.startDate ? (values.startDate as Dayjs).format('YYYY-MM-DD') : undefined;

      const formData: SeasonFormData = {
        name: values.name,
        seasonType: values.seasonType,
        year: values.year,
        startDate,
        description: values.description,
        status: values.status || SeasonStatusValues.draft,
      } as any;

      // derive type/year from startDate if present
      if (startDate && (!formData.seasonType || !formData.year)) {
        const meta = seasonsService.deriveSeasonMeta(startDate);
        formData.seasonType = meta.type as any;
        formData.year = meta.year;
      }

        if (editingSeason) {
        await seasonsService.updateSeason(editingSeason.id, {
          ...formData,
        }, user?.uid || undefined);
          message.success('Season updated successfully');
      } else {
        const newId = await seasonsService.createSeason(formData, user?.uid || '');
        const newSeason = await seasonsService.getSeasonById(newId);
        setEditingSeason(newSeason);
        message.success('Season created successfully');
        await loadSeasons();
        // keep modal open and show created season so the DB key is visible in the editor
        setModalVisible(true);
      }
    } catch (error: any) {
      logger.error('Error saving season:', error);
      message.error(error?.message || 'Failed to save season');
    }
  };


  const columns = [
    {
      title: 'Season Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (id: string) => <Text strong>{id}</Text>,
    },
    {
      title: 'Type',
      key: 'seasonType',
      width: 75,
      render: (record: Season) => (
        <Tag color={seasonColor[record.seasonType]}>
          {seasonLabel[record.seasonType]}
        </Tag>
      ),
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
      width: 50,
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 140,
      render: (val: string) => val ? dayjs(val).format('MMM D, YYYY') : '-',
    },
    // End Date removed — seasons only require a start date
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Created',
      key: 'createdAt',
      width: 150,
      render: (record: Season) => dayjs(record.createdAt).format('MMM D, YYYY'),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (record: Season) => (
        <Tag color={record.status === SeasonStatusValues.active ? 'green' : record.status === SeasonStatusValues.archived ? 'red' : 'default'}>
          {record.status === SeasonStatusValues.active ? 'Active' : record.status === SeasonStatusValues.archived ? 'Archived' : 'Draft'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (record: Season) => {
        const programsCount = programCountBySeason[record.id] || 0;
        const canDelete = programsCount === 0;
        const showArchive = record.status !== SeasonStatusValues.active && record.status !== SeasonStatusValues.archived;
        return (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/seasons?openSeason=${record.id}`, { state: { from: location.pathname + location.search } })}
              disabled={record.status === SeasonStatusValues.archived}
            >
              Edit
            </Button>
            {showArchive && (
              <Popconfirm
                title="Archive Season"
                description="This will archive all programs and teams in this season. Continue?"
                onConfirm={() => handleArchiveSeason(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button size="small" icon={<LockOutlined />}>Archive</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="Delete Season"
              description={canDelete ? 'Are you sure you want to delete this season?' : 'Cannot delete season with programs assigned'}
              onConfirm={() => canDelete ? handleDeleteSeason(record.id) : undefined}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title={canDelete ? 'Delete season' : 'Season has programs; cannot delete'}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={!canDelete} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const expandable = {
    expandedRowRender: (record: Season) => {
      const linked = programs.filter(p => p.seasonId === record.id);
      if (!linked || linked.length === 0) return <div style={{ color: '#888' }}>No programs linked to this season</div>;
      return (
        <div>
          {linked.map((item: Program) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ color: '#666' }}>{item.sport || ''} — {item.ageGroup || ''} {item.basePrice != null ? `— $${item.basePrice}` : ''}</div>
              </div>
              <div>
                <Popconfirm
                  key={`unlink-${item.id}`}
                  title={`Unlink program '${item.name}' from this season?`}
                  onConfirm={() => unlinkProgramFromSeason(item.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button size="small">Unlink</Button>
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      );
    },
  };

  return (
    <div className="page-container">
      <AdminPageHeader
        title="Seasons"
        subtitle="Manage program seasons"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/seasons/new')}>New Season</Button>}
      />

      <Card title="Season Directory">
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start' }}>
          {(() => {
            const items = [
              { key: 'active', label: 'Active' },
              { key: 'draft', label: 'Draft' },
              { key: 'closed', label: 'Closed' },
              { key: 'archived', label: 'Archived' },
              { key: 'all', label: 'All' },
            ];
            return <Tabs activeKey={statusFilter} onChange={(k) => setStatusFilter(k)} items={items} />;
          })()}
        </div>
        <Table
          columns={columns}
          dataSource={seasons.filter(s => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'active') return s.status === SeasonStatusValues.active;
            if (statusFilter === 'archived') return s.status === SeasonStatusValues.archived;
            if (statusFilter === 'closed') return s.status === SeasonStatusValues.closed;
            if (statusFilter === 'draft') return s.status === SeasonStatusValues.draft;
            return true;
          })}
          expandable={expandable}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} seasons`,
            onChange: (page, size) => {
              setPagination({ current: page, pageSize: size || 15 });
              if (size && size !== pagination.pageSize) saveUserPreferences(size || 15);
            }
          }}
          loading={loading}
          size="middle"
        />
      </Card>

      <Modal
        title={editingSeason ? 'Edit Season' : 'Create New Season'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          editorRef.current?.reset();
          setEditingSeason(null);
        }}
        onOk={() => editorRef.current?.submit()}
      >
        <SeasonEditor
          ref={editorRef}
          season={editingSeason}
          onFinish={handleSubmit}
        />
      </Modal>
    </div>
  );
}
