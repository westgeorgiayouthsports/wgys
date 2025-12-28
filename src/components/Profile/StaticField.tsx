import { Tooltip, Typography, Space, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import logger from '../../utils/logger';
const { Text } = Typography;

interface Props {
  label: string;
  value?: string | null;
  help?: string;
  monospace?: boolean;
}

export default function StaticField({ label, value, help, monospace }: Props) {
  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {
      logger.error('Failed to copy to clipboard', e);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>{label}</Text>
      <Space style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
          <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
            <span style={monospace ? { fontFamily: 'monospace', fontSize: 13 } : undefined}>{value || '-'}</span>
          </Text>
        </div>
        {value && (
          <Tooltip title="Copy">
            <Button size="small" icon={<CopyOutlined />} onClick={handleCopy} />
          </Tooltip>
        )}
      </Space>
      {help && <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>{help}</Text>}
    </div>
  );
}
