import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Space, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { seasonsService } from '../services/firebaseSeasons';
import logger from '../utils/logger';
import type { Season } from '../types/season';
import { SeasonStatusValues } from '../types/enums/season';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import SeasonEditor, { SeasonEditorRef } from '../components/SeasonEditor';

const { Title } = Typography;

export default function SeasonDetail() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();
  const [season, setSeason] = useState<Season | null>(null);
  const [editingMode, setEditingMode] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const editorRef = useRef<SeasonEditorRef>(null);
  const location = (window as any).__wgys_location__ || undefined;
  // prefer explicit `from` passed in navigation state, otherwise fall back to history
  const fromPath = (location && (location.state as any)?.from) || undefined;

  useEffect(() => {
    if (!seasonId) {
      navigate('/admin/seasons');
      return;
    }

    // Special-case `new` id to open the editor for creating a season
    if (seasonId === 'new') {
      setSeason(null);
      setEditingMode(true);
      return;
    }

    (async () => {
      try {
        const s = await seasonsService.getSeasonById(seasonId);
        if (!s) {
              message.error('Season not found');
          navigate('/admin/seasons');
          return;
        }
        setSeason(s);
      } catch (e) {
        logger.error('Error loading season', e);
            message.error('Failed to load season');
      }
    })();
  }, [seasonId]);

  if (!season && !editingMode) return <div style={{ padding: 24 }}>Loading...</div>;



  const handleSubmit = async (values: any) => {
    try {
      // Client-side duplicate checks: load all seasons and check before calling service
      try {
        const allSeasons = await seasonsService.getSeasons();
        const nameNorm = (values.name || '').trim().toLowerCase();
        if (nameNorm) {
          const dup = allSeasons.find(s => (s.name || '').trim().toLowerCase() === nameNorm && s.id !== season?.id);
          if (dup) {
            message.error('A season with that name already exists');
            return;
          }
        }
        // determine candidate type/year
        let candidateType: any = values.seasonType;
        let candidateYear: number | undefined = values.year;
        if (!candidateType && values.startDate) {
          const meta = seasonsService.deriveSeasonMeta(values.startDate.format('YYYY-MM-DD'));
          candidateType = meta.type;
          candidateYear = meta.year;
        }
        if (candidateType && candidateYear) {
          const dupTY = allSeasons.find(s => s.seasonType === candidateType && s.year === candidateYear && s.id !== season?.id);
          if (dupTY) {
            message.error('A season with that type and year already exists');
            return;
          }
        }
      } catch (err) {
        // non-fatal: proceed to server-side checks if fetch fails
        logger.error('Could not perform client-side duplicate check', err);
      }
      const startDate = values.startDate ? (values.startDate as any).format('YYYY-MM-DD') : undefined;
      const endDate = values.endDate ? (values.endDate as any).format('YYYY-MM-DD') : undefined;
      const registrationOpen = values.registrationOpen ? (values.registrationOpen as any).format('YYYY-MM-DD') : undefined;
      const registrationClose = values.registrationClose ? (values.registrationClose as any).format('YYYY-MM-DD') : undefined;
      const fiscalYearStart = values.fiscalYearStart ? (values.fiscalYearStart as any).format('YYYY-MM-DD') : undefined;
      const fiscalYearEnd = values.fiscalYearEnd ? (values.fiscalYearEnd as any).format('YYYY-MM-DD') : undefined;

      const payload = {
        name: values.name,
        seasonType: values.seasonType,
        year: values.year,
        startDate,
        endDate,
        registrationOpen,
        registrationClose,
        fiscalYearStart,
        fiscalYearEnd,
        description: values.description,
        status: values.status || SeasonStatusValues.draft,
      } as any;

      if (startDate && (!payload.seasonType || !payload.year)) {
        const meta = seasonsService.deriveSeasonMeta(startDate);
        payload.seasonType = meta.type;
        payload.year = meta.year;
      }

      if (season && season.id) {
        await seasonsService.updateSeason(season.id, payload, user?.uid || undefined);
        const updated = await seasonsService.getSeasonById(season.id);
        setSeason(updated as Season);
        message.success('Season updated');
        setEditingMode(false);
      } else {
        const id = await seasonsService.createSeason(payload, user?.uid || '');
        message.success('Season created');
        navigate(`/admin/seasons/${id}`);
      }
    } catch (e: any) {
      logger.error('Save failed', e);
      message.error(e?.message || 'Failed to save season');
    }
  };

  return (
    <>

      <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space orientation="vertical" style={{ flex: 1 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              if (fromPath) return navigate(fromPath);
              navigate(-1);
            }}
          >
            Back
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>{season?.name || 'New Season'}</Title>
          </div>
        </Space>
        <Space>
          {!editingMode ? (
            <Button icon={<EditOutlined />} onClick={() => setEditingMode(true)}>Edit</Button>
          ) : (
            <>
              <Button type="primary" onClick={() => editorRef.current?.submit()}>Save</Button>
              <Button onClick={() => setEditingMode(false)}>Cancel</Button>
            </>
          )}
        </Space>
      </div>

      <Card>
        {!editingMode ? (
          <SeasonEditor season={season} onFinish={handleSubmit} readOnly />
        ) : (
          <SeasonEditor ref={editorRef} season={season} onFinish={handleSubmit} />
        )}
      </Card>
      </div>
    </>
  );
}
