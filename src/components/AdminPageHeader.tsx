import React from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

interface AdminPageHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  nav?: React.ReactNode;
  className?: string;
}

export default function AdminPageHeader({ title, subtitle, actions, nav, className }: AdminPageHeaderProps) {
  return (
    <div className={className} style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* navigation above the title for easier scanning */}
          {nav && <div style={{ marginBottom: 8 }}>{nav}</div>}
          {title && <Title level={2} style={{ margin: 0 }}>{title}</Title>}
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
        <div style={{ marginLeft: 12 }}>
          {actions}
        </div>
      </div>
    </div>
  );
}
