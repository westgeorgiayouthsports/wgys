import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  Button,
  Space,
  Typography,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Tag,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import type { Family, FamilyMember, Sex, RelationshipType } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function FamilyManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadFamily();
  }, []);

  const loadFamily = async () => {
    setLoading(true);
    try {
      // TODO: Load family from Firebase by user ID
      // For now, create mock family if none exists
      const mockFamily: Family = {
        id: 'family_123',
        name: 'Smith Family',
        primaryMemberId: 'member_1',
        members: [
          {
            id: 'member_1',
            firstName: 'John',
            lastName: 'Smith',
            dateOfBirth: '1985-05-15',
            sex: 'male',
            relationship: 'parent',
            isPrimary: true,
            userId: user?.uid,
            email: user?.email || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
      };
      setFamily(mockFamily);
    } catch (error) {
      console.error('❌ Error loading family:', error);
      message.error('Failed to load family');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    form.resetFields();
    setMemberModalVisible(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    form.setFieldsValue({
      ...member,
      dateOfBirth: dayjs(member.dateOfBirth),
    });
    setMemberModalVisible(true);
  };

  const handleDeleteMember = (memberId: string) => {
    if (!family) return;
    const updatedMembers = family.members.filter(m => m.id !== memberId);
    setFamily({ ...family, members: updatedMembers });
    message.success('Family member removed');
  };

  const handleMemberSubmit = (values: any) => {
    if (!family) return;

    const memberData: FamilyMember = {
      id: editingMember?.id || `member_${Date.now()}`,
      ...values,
      dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
      isPrimary: editingMember?.isPrimary || false,
      createdAt: editingMember?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedMembers;
    if (editingMember) {
      updatedMembers = family.members.map(m => 
        m.id === editingMember.id ? memberData : m
      );
    } else {
      updatedMembers = [...family.members, memberData];
    }

    setFamily({ ...family, members: updatedMembers });
    setMemberModalVisible(false);
    form.resetFields();
    message.success(editingMember ? 'Family member updated' : 'Family member added');
  };

  const calculateAge = (dateOfBirth: string) => {
    return dayjs().diff(dayjs(dateOfBirth), 'year');
  };

  const calculateCurrentGrade = (graduationYear?: number) => {
    if (!graduationYear) return null;
    const currentDate = dayjs();
    const currentYear = currentDate.year();
    const isAfterAugust = currentDate.month() >= 7; // August is month 7 (0-indexed)
    const schoolYear = isAfterAugust ? currentYear : currentYear - 1;
    const grade = 12 - (graduationYear - schoolYear - 1);
    return grade >= 0 && grade <= 12 ? grade : null;
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: FamilyMember) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.firstName} {record.lastName}
            {record.isPrimary && <Tag color="gold" style={{ marginLeft: 8 }}>Primary</Tag>}
          </div>
          <Text type="secondary">{record.relationship}</Text>
        </div>
      ),
    },
    {
      title: 'Age',
      key: 'age',
      render: (record: FamilyMember) => calculateAge(record.dateOfBirth),
    },
    {
      title: 'Sex',
      dataIndex: 'sex',
      key: 'sex',
      render: (sex: Sex) => (
        <Tag color={sex === 'male' ? 'blue' : sex === 'female' ? 'pink' : 'default'}>
          {sex}
        </Tag>
      ),
    },
    {
      title: 'School Info',
      key: 'school',
      render: (record: FamilyMember) => {
        const currentGrade = calculateCurrentGrade(record.graduationYear);
        return (
          <div>
            {record.schoolName && <div>{record.schoolName}</div>}
            {record.graduationYear && <div><Text type="secondary">Class of {record.graduationYear}</Text></div>}
            {currentGrade !== null && (
              <div><Text type="secondary">
                Grade {currentGrade === 0 ? 'K' : currentGrade}
              </Text></div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: FamilyMember) => (
        <div>
          {record.email && <div>{record.email}</div>}
          {record.phone && <Text type="secondary">{record.phone}</Text>}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: FamilyMember) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditMember(record)}
          >
            Edit
          </Button>
          {!record.isPrimary && (
            <Popconfirm
              title="Remove Family Member"
              description="Are you sure you want to remove this family member?"
              onConfirm={() => handleDeleteMember(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Remove
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!family) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page-container">
        <div style={{ marginBottom: '24px' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>Family Management</Title>
              <Text type="secondary">Manage your family members and athletes</Text>
            </div>
            <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddMember}>
              Add Family Member
            </Button>
          </Space>
        </div>

        <Card title={`${family.members.find(m => m.isPrimary)?.lastName || 'Family'} Family (${family.members.length} members)`}>
          <Table
            columns={columns}
            dataSource={family.members}
            rowKey="id"
            pagination={false}
          />
        </Card>

        <Modal
          title={editingMember ? 'Edit Family Member' : 'Add Family Member'}
          open={memberModalVisible}
          onCancel={() => {
            setMemberModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleMemberSubmit}>
            <Space style={{ width: '100%' }} size="large">
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                <Input placeholder="Enter first name" />
              </Form.Item>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
                <DatePicker />
              </Form.Item>
              <Form.Item name="sex" label="Sex" rules={[{ required: true }]}>
                <Select placeholder="Select sex">
                  <Select.Option value="male">Male</Select.Option>
                  <Select.Option value="female">Female</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="relationship" label="Relationship" rules={[{ required: true }]}>
                <Select placeholder="Select relationship">
                  <Select.Option value="parent">Parent</Select.Option>
                  <Select.Option value="guardian">Guardian</Select.Option>
                  <Select.Option value="child">Child</Select.Option>
                  <Select.Option value="sibling">Sibling</Select.Option>
                  <Select.Option value="grandparent">Grandparent</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item name="schoolName" label="School Name">
                <Input placeholder="Enter school name" />
              </Form.Item>
              <Form.Item name="graduationYear" label="Graduation Year">
                <Input placeholder="e.g., 2030" />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item name="email" label="Email">
                <Input placeholder="Enter email address" />
              </Form.Item>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Space>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setMemberModalVisible(false);
                  form.resetFields();
                }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingMember ? 'Update Member' : 'Add Member'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
    </div>
  );
}