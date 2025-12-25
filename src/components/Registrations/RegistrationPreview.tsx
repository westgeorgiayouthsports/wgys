import { Card, Typography, Input, Select, Button, Divider, theme, Tag } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import type { Program } from '../../types/program';

const { Title, Text } = Typography;

interface Props {
  program: Program;
  registrantCount: number;
}

export default function RegistrationPreview({ program, registrantCount }: Props) {
  const { token } = theme.useToken();

  return (
    <div style={{ color: token.colorText }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ margin: 0, color: token.colorText }}>{program.name}</Title>
          <Text type="secondary">{program.description}</Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: token.colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
            <DollarOutlined style={{ color: '#fff' }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Text strong>Pay in Full</Text>
            <div><Text>${(program.basePrice || 0).toFixed(2)}</Text></div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Text strong>Registrants</Text>
            <div><Text>{registrantCount}{program.maxParticipants ? ` / ${program.maxParticipants}` : ''}</Text></div>
          </div>
          {((program as any).private) && <div style={{ marginTop: 8 }}><Tag color="gold">Invite Only</Tag></div>}
        </div>
      </div>

      <Divider />

      <Card size="small" style={{ background: token.colorBgContainer, borderColor: token.colorBorder }}>
        <Title level={5} style={{ marginBottom: 12, color: token.colorText }}>Registration Preview</Title>

        {program.questions && program.questions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ color: token.colorText }}>Additional Information</Text>
            <div style={{ marginTop: 8 }}>
              {program.questions.sort((a,b)=>a.order-b.order).map(q => (
                <div key={q.id} style={{ marginBottom: 12 }}>
                  <Text strong style={{ color: token.colorText }}>{q.title}{q.required ? ' *' : ''}</Text>
                  <div style={{ marginTop: 6 }}>
                    {q.type === 'short_answer' && <Input placeholder="Short answer" disabled />}
                    {q.type === 'paragraph' && <Input.TextArea rows={3} placeholder="Paragraph" disabled />}
                    {q.type === 'dropdown' && <Select style={{ width: 300 }} options={(q.options||[]).map(o=>({label:o,value:o}))} disabled />}
                    {q.type === 'checkboxes' && <Select mode="multiple" style={{ width: 300 }} options={(q.options||[]).map(o=>({label:o,value:o}))} disabled />}
                    {q.type === 'file_upload' && (
                      <div style={{ color: token.colorText }}><Text type="secondary">No file uploaded (preview)</Text></div>
                    )}
                    {q.type === 'waiver' && <div><input type="checkbox" disabled /> <Text style={{ color: token.colorText }}> {q.title}</Text></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: Base Amount then action row */}
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 12, background: token.colorBgElevated, borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ color: token.colorText }}>Base Amount</Text>
              <Text strong style={{ color: token.colorText }}>${(program.basePrice || 0).toFixed(2)}</Text>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {program.maxParticipants && registrantCount >= program.maxParticipants ? (
              <Tag color="red">Full</Tag>
            ) : (
              <Button type="primary">Register</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
