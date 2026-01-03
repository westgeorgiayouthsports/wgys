import { useEffect, useState } from 'react';
import { Card, Select, Table, Button, Space, Switch, notification, Alert } from 'antd';
import AdminPageHeader from '../components/AdminPageHeader';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { seasonsService } from '../services/firebaseSeasons';
import { firebaseDiscounts } from '../services/firebaseDiscounts';

export default function SeasonDiscounts() {
  const [notifApi, notifContextHolder] = notification.useNotification();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [globalDiscounts, setGlobalDiscounts] = useState<any[]>([]);
  const [seasonConfigs, setSeasonConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => { loadSeasons(); loadGlobalDiscounts(); }, []);

  const loadSeasons = async () => {
    const s = await seasonsService.getSeasons();
    setSeasons(s || []);
    if (s && s.length) setSeasonId(s[0].id);
  };

  const loadGlobalDiscounts = async () => {
    try {
      const d = await firebaseDiscounts.getDiscounts();
      setGlobalDiscounts(d || []);
      setPermissionDenied(false);
    } catch (e: any) {
      // permission denied likely from RTDB rules
      console.error('Error fetching discounts:', e);
      if ((e && e.code && e.code.includes('permission')) || (e && String(e).toLowerCase().includes('permission denied'))) {
        setPermissionDenied(true);
      }
      notifApi.error({ title: 'Failed to load discounts' });
    }
  };

  const loadSeasonConfigs = async (sid: string) => {
    setLoading(true);
    try {
      const cfg = await firebaseDiscounts.getSeasonDiscountConfigs(sid) || {};
      setSeasonConfigs(cfg);
    } catch (e) {
      console.error(e);
      notifApi.error({ title: 'Failed to load season discount configs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (seasonId) loadSeasonConfigs(seasonId); }, [seasonId]);
  const navigate = useNavigate();
  const location = (window as any).__wgys_location__ || undefined;
  const fromPath = (location && (location.state as any)?.from) || undefined;

  const toggleLink = async (discountId: string, linked: boolean) => {
    if (!seasonId) return;
    try {
      if (linked) {
        // create default overlay entry
        await firebaseDiscounts.setSeasonDiscountConfig(seasonId, discountId, { discountId, active: true });
      } else {
        await firebaseDiscounts.removeSeasonDiscountConfig(seasonId, discountId);
      }
      await loadSeasonConfigs(seasonId);
      notifApi.success({ title: 'Season discount updated' });
    } catch (e) {
      console.error(e);
      notifApi.error({ title: 'Failed to update season discount' });
    }
  };

  const createDefaults = async () => {
    if (!seasonId) return;
    try {
      // ensure common defaults exist linking to global ids 'sibling' and 'earlybird' if present
      const all = await firebaseDiscounts.getDiscounts();
      const sibling = all.find((x: any) => (x.id === 'sibling' || (x.code || '').toLowerCase().includes('sibling')));
      const early = all.find((x: any) => (x.id === 'earlybird' || (x.code || '').toLowerCase().includes('early')));
      if (sibling) await firebaseDiscounts.setSeasonDiscountConfig(seasonId, 'sibling', { discountId: sibling.id, active: true });
      if (early) await firebaseDiscounts.setSeasonDiscountConfig(seasonId, 'earlybird', { discountId: early.id, active: true });
      await loadSeasonConfigs(seasonId);
      notifApi.success({ title: 'Defaults created' });
    } catch (e) {
      console.error(e);
      notifApi.error({ title: 'Failed to create defaults' });
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Linked', key: 'linked', render: (_: any, r: any) => {
      const linked = !!seasonConfigs[r.id];
      return <Switch checked={linked} onChange={(v) => toggleLink(r.id, v)} />;
    }},
  ];

  return (
    <div style={{ padding: 24 }}>
      {notifContextHolder}
      <AdminPageHeader
        title="Season Discounts"
        subtitle={null}
        nav={<Button icon={<ArrowLeftOutlined />} onClick={() => { if (fromPath) return navigate(fromPath); navigate(-1); }}>Back</Button>}
        actions={<Space><Button onClick={createDefaults}>Create Defaults</Button></Space>}
      />
      <Card>
        {permissionDenied && (
          <Alert
            message="Permission denied"
            description={"Your account cannot read global discounts. Update RTDB rules to allow access to /discounts for authenticated/admin users or sign in with an admin account."}
            type="warning"
            style={{ marginBottom: 12 }}
          />
        )}
        <div style={{ marginBottom: 12 }}>
          <Select style={{ width: 320 }} value={seasonId || undefined} onChange={(v) => setSeasonId(v)} options={(seasons || []).map(s => ({ label: `${s.name} (${s.year})`, value: s.id }))} />
        </div>
        <Table dataSource={globalDiscounts.map(d => ({ ...d, key: d.id }))} columns={columns} loading={loading} />
      </Card>
    </div>
  );
}
