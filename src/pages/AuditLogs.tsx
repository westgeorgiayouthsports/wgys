import React, { useEffect, useState } from 'react';
import { Table, Card, Input, Select, Button, Space, Typography, Popconfirm, message } from 'antd';
import { auditLogService } from '../services/auditLog';
import type { AuditRecord } from '../services/auditLog';
import type { RootState } from '../store/store';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function AuditLogs() {
  const { role } = useSelector((state: RootState) => state.auth);
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [qAction, setQAction] = useState('');
  const [qActor, setQActor] = useState('');
  const [qEntityType, setQEntityType] = useState<string | 'all'>('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await auditLogService.getLogs(1000);
    setLogs(data.sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||'')));
    setLoading(false);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    const ok = await auditLogService.deleteLog(id);
    setLoading(false);
    if (ok) {
      message.success('Deleted audit entry');
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } else {
      message.error('Failed to delete audit entry');
    }
  };

  const filtered = logs.filter(l => {
    if (qAction && !(l.action || '').toLowerCase().includes(qAction.toLowerCase())) return false;
    if (qActor && !((l.actorEmail||'') + (l.actorId||'')).toLowerCase().includes(qActor.toLowerCase())) return false;
    if (qEntityType !== 'all' && l.entityType !== qEntityType) return false;
    return true;
  });

  if (role !== 'admin' && role !== 'owner') return <div style={{ padding: 40 }}>Access denied</div>;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Audit Logs</Title>
        </div>
        <Space>
          <Button onClick={load}>Refresh</Button>
        </Space>
      </div>

      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Input placeholder="Action (e.g., program.bulk_update)" value={qAction} onChange={(e) => setQAction(e.target.value)} style={{ width: 320 }} />
          <Input placeholder="Actor email or id" value={qActor} onChange={(e) => setQActor(e.target.value)} style={{ width: 220 }} />
          <Select value={qEntityType} onChange={(v) => setQEntityType(v)} style={{ width: 160 }}>
            <Select.Option value="all">All Entities</Select.Option>
            <Select.Option value="program">Program</Select.Option>
            <Select.Option value="team">Team</Select.Option>
            <Select.Option value="season">Season</Select.Option>
            <Select.Option value="person">Person</Select.Option>
            <Select.Option value="family">Family</Select.Option>
            <Select.Option value="teamAssignment">Team Assignment</Select.Option>
            <Select.Option value="other">Other</Select.Option>
          </Select>
        </Space>

        <Table
          dataSource={filtered}
          loading={loading}
          rowKey={(r) => r.id || `${r.timestamp}-${r.action}`}
          pagination={{ pageSize: 25 }}
          columns={[
            { title: 'Time', dataIndex: 'timestamp', key: 'timestamp', render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '' },
            { title: 'Action', dataIndex: 'action', key: 'action' },
            { title: 'Entity', dataIndex: 'entityType', key: 'entityType' },
            { title: 'Entity ID', dataIndex: 'entityId', key: 'entityId' },
            { title: 'Actor', key: 'actor', render: (r: AuditRecord) => r.actorEmail || r.actorId || '' },
              { title: 'Details', dataIndex: 'details', key: 'details', render: (d: any) => typeof d === 'string' ? d : JSON.stringify(d) },
              { title: 'Actions', key: 'actions', render: (r: AuditRecord) => (
                role === 'owner' ? (
                  <Popconfirm title="Delete this audit entry?" onConfirm={() => handleDelete(r.id)} okText="Delete" cancelText="Cancel">
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ) : null
              ) },
          ]}
        />
      </Card>
    </div>
  );
}
