import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Spin,
  Popconfirm,
  Avatar,
  Checkbox,
  App,
  
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  HomeOutlined,
  FormOutlined,
  QuestionCircleOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import { peopleService } from '../services/firebasePeople';
import type { Person, PersonFormData, PersonRole } from '../types/person';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Family() {
  const { message } = App.useApp();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<Person[]>([]);
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [sameAddress, setSameAddress] = useState(false);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [currentFamily, setCurrentFamily] = useState<any>(null);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>('');
  const [familyName, setFamilyName] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    setLoading(true);
    try {
      const allPeople = await peopleService.getPeople();
      
      // Find current user's person record
      const userPerson = allPeople.find(p => p.userId === user?.uid);
      setCurrentUser(userPerson || null);
      
      if (userPerson?.familyId) {
        // Load family members
        const family = await peopleService.getPeopleByFamily(userPerson.familyId);
        setFamilyMembers(family);
        
        // Load family details
        const { familiesService } = await import('../services/firebaseFamilies');
        const familyDetails = await familiesService.getFamily(userPerson.familyId);
        setCurrentFamily(familyDetails);
      } else if (userPerson) {
        // User exists but no family - show just themselves
        setFamilyMembers([userPerson]);
      } else {
        // Create person record for user if doesn't exist
        const newPersonData: PersonFormData = {
          firstName: user?.displayName?.split(' ')[0] || 'User',
          lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
          email: user?.email || '',
          roles: ['parent'],
        };
        
        const newPersonId = await peopleService.createPerson(newPersonData, user?.uid || '');
        await peopleService.linkPersonToAccount(newPersonId, user?.uid || '');
        
        const newPerson: Person = {
          id: newPersonId,
          ...newPersonData,
          hasAccount: true,
          userId: user?.uid,
          relationships: [],
          contactPreferences: [],
          programs: [],
          teams: [],
          groups: [],
          source: 'signup',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          isActive: true,
        };
        
        setCurrentUser(newPerson);
        setFamilyMembers([newPerson]);
      }
    } catch (error: unknown) {
      console.error('❌ Error loading family data:', error);
      message.error('Failed to load family information');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFamilyMember = () => {
    setEditingPerson(null);
    form.resetFields();
    setSameAddress(true);
    // Pre-fill with family address if available
    if (currentUser) {
      form.setFieldsValue({
        address: currentUser.address,
        city: currentUser.city,
        state: currentUser.state,
        zipCode: currentUser.zipCode,
      });
    }
    setModalVisible(true);
  };

  const handleEditPerson = (person: Person) => {
    // Only allow editing if it's the current user, their family member, or someone they created
    if (person.userId !== user?.uid && 
        person.familyId !== currentUser?.familyId && 
        person.createdBy !== user?.uid) {
      message.error('You can only edit your own family members');
      return;
    }
    
    setEditingPerson(person);
    const hasSameAddress = currentUser && 
      person.address === currentUser.address &&
      person.city === currentUser.city &&
      person.state === currentUser.state &&
      person.zipCode === currentUser.zipCode;
    setSameAddress(person.userId === user?.uid ? false : hasSameAddress);
    form.setFieldsValue({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
      dateOfBirth: person.dateOfBirth ? dayjs(person.dateOfBirth) : null,
      sex: person.sex,
      roles: person.roles,
      address: person.address,
      city: person.city,
      state: person.state,
      zipCode: person.zipCode,
      schoolName: person.schoolName,
      graduationYear: person.graduationYear,
    });
    setModalVisible(true);
  };

  const handleDeletePerson = async (personId: string) => {
    const person = familyMembers.find(p => p.id === personId);
    
    // Don't allow deleting the current user
    if (person?.userId === user?.uid) {
      message.error('You cannot delete your own account');
      return;
    }
    
    // Only allow deleting family members
    if (person?.familyId !== currentUser?.familyId) {
      message.error('You can only delete your own family members');
      return;
    }
    
    try {
      await peopleService.deletePerson(personId);
      setFamilyMembers(familyMembers.filter(p => p.id !== personId));
      message.success('Family member removed successfully');
    } catch (error) {
      console.error('❌ Error deleting person:', error);
      message.error('Failed to remove family member');
    }
  };

  const handleSubmit = async (values: PersonFormData) => {
    try {
      const formData = {
        ...values,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth).format('YYYY-MM-DD') : undefined,
      };

      // Auto-assign primary account address for athletes
      if (formData.roles?.includes('athlete') && currentUser) {
        formData.address = currentUser.address;
        formData.city = currentUser.city;
        formData.state = currentUser.state;
        formData.zipCode = currentUser.zipCode;
      }

      // Clear school fields for non-athletes
      if (!formData.roles?.includes('athlete')) {
        formData.schoolName = undefined;
        formData.graduationYear = undefined;
      }

      if (editingPerson) {
        await peopleService.updatePerson(editingPerson.id, formData);
        setFamilyMembers(familyMembers.map(p => 
          p.id === editingPerson.id 
            ? { ...p, ...formData, updatedAt: new Date().toISOString() }
            : p
        ));
        message.success('Information updated successfully');
      } else {
        // Create new family member
        const newPersonId = await peopleService.createPerson(formData, user?.uid || '');
        
        // Add to family if user has one, otherwise create family
        let familyId = currentUser?.familyId;
        if (currentUser?.familyId) {
          await peopleService.addPersonToFamily(currentUser.familyId, newPersonId);
        } else if (currentUser) {
          // Create family with current user as primary
          const familyName = `${currentUser.lastName} Family`;
          familyId = await peopleService.createFamily(familyName, currentUser.id, user?.uid || '');
          await peopleService.addPersonToFamily(familyId, newPersonId);
          
          // Update current user with family ID
          setCurrentUser({ ...currentUser, familyId });
        }
        
        const newPerson: Person = {
          id: newPersonId,
          ...formData,
          hasAccount: false,
          familyId,
          relationships: [],
          contactPreferences: [],
          programs: [],
          teams: [],
          groups: [],
          source: 'manual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          isActive: true,
        };
        
        setFamilyMembers([...familyMembers, newPerson]);
        message.success('Family member added successfully');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('❌ Error saving person:', error);
      message.error('Failed to save information');
    }
  };

  const getRoleColor = (role: PersonRole) => {
    const colors = {
      parent: 'blue',
      guardian: 'cyan',
      athlete: 'green',
      coach: 'orange',
      volunteer: 'purple',
      staff: 'gold',
      grandparent: 'magenta',
      relative: 'geekblue',
      other: 'default',
    };
    return colors[role] || 'default';
  };

  const calculateAge = (dateOfBirth: string) => {
    return dayjs().diff(dayjs(dateOfBirth), 'year');
  };

  const handleRegisterAthlete = (person: Person) => {
    const params = new URLSearchParams();
    if (person.dateOfBirth) params.set('dateOfBirth', person.dateOfBirth);
    if (person.sex) params.set('sex', person.sex);
    params.set('athleteId', person.id);
    navigate(`/register?${params.toString()}`);
  };

  const handleRegistrationHelp = (person: Person) => {
    const params = new URLSearchParams();
    if (person.dateOfBirth) {
      params.set('dateOfBirth', person.dateOfBirth);
    }
    if (person.sex) {
      params.set('sex', person.sex);
    }
    navigate(`/registration-help?${params.toString()}`);
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: Person) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            size={40} 
            src={record.photoURL}
            icon={<UserOutlined />}
            style={{ backgroundColor: record.hasAccount ? '#52c41a' : '#1890ff' }}
            onError={() => true}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.firstName} {record.lastName}
              {record.userId === user?.uid && <Tag color="gold" style={{ marginLeft: 8 }}>You</Tag>}
              {currentFamily && record.id === currentFamily.primaryPersonId && <Tag color="blue" style={{ marginLeft: 8 }}>Primary</Tag>}
              {record.hasAccount && record.userId !== user?.uid && <Tag color="green" style={{ marginLeft: 8 }}>Account</Tag>}
            </div>
            <Text type="secondary">{record.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Relationship',
      key: 'roles',
      render: (record: Person) => (
        <div>
          {record.roles.map(role => (
            <Tag key={role} color={getRoleColor(role)} style={{ marginBottom: '4px' }}>
              {role}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: Person) => (
        <div>
          {record.phone && <div>{record.phone}</div>}
          {record.dateOfBirth && (
            <Text type="secondary">Age: {calculateAge(record.dateOfBirth)}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'School Info',
      key: 'school',
      render: (record: Person) => (
        <div>
          {record.schoolName && <div>{record.schoolName}</div>}
          {record.graduationYear && (
            <Text type="secondary">Class of {record.graduationYear}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Person) => (
        <Space>
          {record.roles.includes('athlete') && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<FormOutlined />}
                onClick={() => { handleRegisterAthlete(record); }}
              >
                Register
              </Button>
              <Button
                size="small"
                icon={<QuestionCircleOutlined />}
                onClick={() => { handleRegistrationHelp(record); }}
                title="Registration Help"
              >
                Help
              </Button>
            </>
          )}
          {currentFamily && (record.roles?.includes('parent') || record.roles?.includes('guardian')) && record.id !== currentFamily.primaryPersonId && (
            <Button
              size="small"
              type="primary"
              icon={<CrownOutlined />}
              onClick={async () => {
                try {
                  const { familiesService } = await import('../services/firebaseFamilies');
                  await familiesService.updateFamily(currentFamily.id, { primaryPersonId: record.id });
                  setCurrentFamily({ ...currentFamily, primaryPersonId: record.id });
                  message.success({ content: `${record.firstName} ${record.lastName} is now the primary member` });
                } catch {
                  message.error({ content: 'Failed to set primary member' });
                }
              }}
            >
              Set Primary
            </Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => { handleEditPerson(record); }}
          >
            Edit
          </Button>
          {record.userId !== user?.uid && currentFamily?.primaryPersonId !== record.id && (
            <Popconfirm
              title="Remove Family Member"
              description="Are you sure you want to remove this family member?"
              onConfirm={() => handleDeletePerson(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                Remove
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              My Family
            </Title>
            <Text type="secondary">
              Manage your family information and add family members
            </Text>
          </Col>
          <Col>
            <Space>
              {currentFamily && (
                <Button
                  icon={<HomeOutlined />}
                  onClick={() => {
                    setFamilyName(currentFamily.name);
                    setSelectedPrimaryId(currentFamily.primaryPersonId);
                    setFamilyModalVisible(true);
                  }}
                >
                  Manage Family
                </Button>
              )}
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={handleAddFamilyMember}
              >
                Add Family Member
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Card 
        title={
          <Space>
            <HomeOutlined />
            <span>{currentUser?.lastName || 'Your'} Family ({familyMembers.length} members)</span>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={familyMembers}
            rowKey="id"
            pagination={false}
            locale={{
              emptyText: 'No family members found'
            }}
          />
        </Spin>
      </Card>

      {/* Add/Edit Family Member Modal */}
      <Modal
        title={
          <div>
            {editingPerson ? 'Edit Family Member' : 'Add Family Member'}
            {editingPerson?.userId === user?.uid && (
              <Tag color="blue" style={{ marginLeft: 8 }}>Primary Account</Tag>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email (Optional)"
                rules={[{ type: 'email', message: 'Please enter valid email' }]}
              >
                <Input placeholder="Enter email address (optional)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <DatePicker 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sex" label="Sex">
                <Select placeholder="Select sex">
                  <Select.Option value="male">Male</Select.Option>
                  <Select.Option value="female">Female</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="roles"
                label="Relationship"
                rules={[
                  { required: true, message: 'Please select relationship' },
                  {
                    validator: (_, value) => {
                      if (!value || value.length === 0) return Promise.resolve();
                      
                      // Child/athlete cannot have other roles
                      if (value.includes('athlete') && value.length > 1) {
                        return Promise.reject('Child/Athlete cannot have other relationships');
                      }
                      
                      // Relative/other cannot be core family roles
                      const coreRoles = ['parent', 'guardian', 'athlete', 'grandparent'];
                      const peripheralRoles = ['relative', 'other'];
                      const hasCoreRole = value.some(role => coreRoles.includes(role));
                      const hasPeripheralRole = value.some(role => peripheralRoles.includes(role));
                      
                      if (hasCoreRole && hasPeripheralRole) {
                        return Promise.reject('Relative/Other cannot be combined with family roles');
                      }
                      
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Select mode="multiple" placeholder="Select relationship">
                  <Select.Option value="athlete">Child/Athlete</Select.Option>
                  <Select.Option value="coach">Coach</Select.Option>
                  <Select.Option value="grandparent">Grandparent</Select.Option>
                  <Select.Option value="guardian">Guardian</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                  <Select.Option value="parent">Parent</Select.Option>
                  <Select.Option value="relative">Relative</Select.Option>
                  <Select.Option value="staff">Staff</Select.Option>
                  <Select.Option value="volunteer">Volunteer</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.roles !== currentValues.roles}>
            {({ getFieldValue }) => {
              const roles = getFieldValue('roles') || [];
              const isAthlete = roles.includes('athlete');
              
              if (isAthlete) {
                return null; // Hide address fields for athletes
              }
              
              return (
                <>
                  <Form.Item>
                    <Checkbox 
                      checked={sameAddress}
                      disabled={editingPerson?.userId === user?.uid}
                      onChange={(e) => {
                        setSameAddress(e.target.checked);
                        if (e.target.checked && currentUser) {
                          form.setFieldsValue({
                            address: currentUser.address,
                            city: currentUser.city,
                            state: currentUser.state,
                            zipCode: currentUser.zipCode,
                          });
                        } else {
                          form.setFieldsValue({
                            address: '',
                            city: '',
                            state: '',
                            zipCode: '',
                          });
                        }
                      }}
                    >
                      Same address as primary account
                    </Checkbox>
                  </Form.Item>

                  <Form.Item name="address" label="Address">
                    <Input 
                      placeholder="Enter street address" 
                      disabled={sameAddress}
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="city" label="City">
                        <Input 
                          placeholder="Enter city" 
                          disabled={sameAddress}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="state" label="State">
                        <Select 
                          placeholder="Select state" 
                          disabled={sameAddress}
                          showSearch
                          optionFilterProp="children"
                        >
                          <Select.Option value="AL">Alabama</Select.Option>
                          <Select.Option value="AK">Alaska</Select.Option>
                          <Select.Option value="AZ">Arizona</Select.Option>
                          <Select.Option value="AR">Arkansas</Select.Option>
                          <Select.Option value="CA">California</Select.Option>
                          <Select.Option value="CO">Colorado</Select.Option>
                          <Select.Option value="CT">Connecticut</Select.Option>
                          <Select.Option value="DE">Delaware</Select.Option>
                          <Select.Option value="FL">Florida</Select.Option>
                          <Select.Option value="GA">Georgia</Select.Option>
                          <Select.Option value="HI">Hawaii</Select.Option>
                          <Select.Option value="ID">Idaho</Select.Option>
                          <Select.Option value="IL">Illinois</Select.Option>
                          <Select.Option value="IN">Indiana</Select.Option>
                          <Select.Option value="IA">Iowa</Select.Option>
                          <Select.Option value="KS">Kansas</Select.Option>
                          <Select.Option value="KY">Kentucky</Select.Option>
                          <Select.Option value="LA">Louisiana</Select.Option>
                          <Select.Option value="ME">Maine</Select.Option>
                          <Select.Option value="MD">Maryland</Select.Option>
                          <Select.Option value="MA">Massachusetts</Select.Option>
                          <Select.Option value="MI">Michigan</Select.Option>
                          <Select.Option value="MN">Minnesota</Select.Option>
                          <Select.Option value="MS">Mississippi</Select.Option>
                          <Select.Option value="MO">Missouri</Select.Option>
                          <Select.Option value="MT">Montana</Select.Option>
                          <Select.Option value="NE">Nebraska</Select.Option>
                          <Select.Option value="NV">Nevada</Select.Option>
                          <Select.Option value="NH">New Hampshire</Select.Option>
                          <Select.Option value="NJ">New Jersey</Select.Option>
                          <Select.Option value="NM">New Mexico</Select.Option>
                          <Select.Option value="NY">New York</Select.Option>
                          <Select.Option value="NC">North Carolina</Select.Option>
                          <Select.Option value="ND">North Dakota</Select.Option>
                          <Select.Option value="OH">Ohio</Select.Option>
                          <Select.Option value="OK">Oklahoma</Select.Option>
                          <Select.Option value="OR">Oregon</Select.Option>
                          <Select.Option value="PA">Pennsylvania</Select.Option>
                          <Select.Option value="RI">Rhode Island</Select.Option>
                          <Select.Option value="SC">South Carolina</Select.Option>
                          <Select.Option value="SD">South Dakota</Select.Option>
                          <Select.Option value="TN">Tennessee</Select.Option>
                          <Select.Option value="TX">Texas</Select.Option>
                          <Select.Option value="UT">Utah</Select.Option>
                          <Select.Option value="VT">Vermont</Select.Option>
                          <Select.Option value="VA">Virginia</Select.Option>
                          <Select.Option value="WA">Washington</Select.Option>
                          <Select.Option value="WV">West Virginia</Select.Option>
                          <Select.Option value="WI">Wisconsin</Select.Option>
                          <Select.Option value="WY">Wyoming</Select.Option>
                          <Select.Option value="DC">District of Columbia</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="zipCode" label="Zip Code">
                        <Input 
                          placeholder="Enter zip code" 
                          disabled={sameAddress}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              );
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.roles !== currentValues.roles}>
            {({ getFieldValue }) => {
              const roles = getFieldValue('roles') || [];
              const isAthlete = roles.includes('athlete');
              
              if (!isAthlete) {
                return null; // Hide school fields for non-athletes
              }
              
              return (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="schoolName" label="School Name">
                      <Input placeholder="Enter school name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="graduationYear" label="Graduation Year">
                      <Input type="number" placeholder="Enter graduation year" />
                    </Form.Item>
                  </Col>
                </Row>
              );
            }}
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPerson ? 'Update' : 'Add Family Member'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Manage Family Modal */}
      <Modal
        title="Manage Family"
        open={familyModalVisible}
        onCancel={() => setFamilyModalVisible(false)}
        onOk={async () => {
          try {
            if (!selectedPrimaryId) {
              message.error({ content: 'Please select a primary family member' });
              return;
            }
            
            const { familiesService } = await import('../services/firebaseFamilies');
            await familiesService.updateFamily(currentFamily.id, {
              name: familyName,
              primaryPersonId: selectedPrimaryId
            });
            
            message.success({ content: 'Family updated successfully' });
            setFamilyModalVisible(false);
            await loadFamilyData();
          } catch {
            message.error({ content: 'Failed to update family' });
          }
        }}
        width={500}
      >
        {currentFamily && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Family Name</label>
              <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Enter family name" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Primary Family Member</label>
              <Select
                style={{ width: '100%' }}
                value={selectedPrimaryId}
                onChange={(value) => setSelectedPrimaryId(value)}
                placeholder="Select primary member"
                options={familyMembers.filter(p => p.roles?.includes('parent') || p.roles?.includes('guardian')).map(p => ({
                  label: `${p.firstName} ${p.lastName}`,
                  value: p.id
                }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}