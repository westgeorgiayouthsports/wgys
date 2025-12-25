import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card,
  Button,
  Space,
  Typography,
  Form,
  Input,
  Select,
  Switch,
  App,
  Table,
  Modal,
  Popconfirm,
  DatePicker,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import type { RootState } from '../store/store';
import type { Program, ProgramQuestion } from '../types';
import { programsService } from '../services/firebasePrograms';
import { seasonsService } from '../services/firebaseSeasons';
import type { Season } from '../types/season';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { role } = useSelector((state: RootState) => state.auth);
  const { message } = App.useApp();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ProgramQuestion | null>(null);
  const [questionForm] = Form.useForm();
  const [programForm] = Form.useForm();

  if (role !== 'admin' && role !== 'owner') {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Title level={2} type="danger">Access Denied</Title>
        <Text type="secondary">You need admin or owner privileges to access this page.</Text>
      </div>
    );
  }

  useEffect(() => {
    if (programId) {
      loadProgram();
    }
    loadSeasons();
  }, [programId]);

  const loadSeasons = async () => {
    try {
      const list = await seasonsService.getSeasons();
      setSeasons(list.filter(s => s.status === 'active'));
    } catch (err) {
      console.error('Failed to load seasons', err);
      setSeasons([]);
    }
  };

  const loadProgram = async () => {
    setLoading(true);
    try {
      const programs = await programsService.getPrograms();
      const foundProgram = programs.find(p => p.id === programId);
      if (foundProgram) {
        const programWithQuestions = { ...foundProgram, questions: foundProgram.questions || [] };
        setProgram(programWithQuestions);
      } else {
        message.error('Program not found');
      }
    } catch (error) {
      console.error('❌ Error loading program:', error);
      message.error('Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (program) {
      programForm.setFieldsValue({
        ...program,
        femaleOnlyToggle: program.sexRestriction === 'female',
        registrationStart: program.registrationStart ? dayjs(program.registrationStart) : null,
        registrationEnd: program.registrationEnd ? dayjs(program.registrationEnd) : null,
        birthDateStart: program.birthDateStart ? dayjs(program.birthDateStart) : null,
        birthDateEnd: program.birthDateEnd ? dayjs(program.birthDateEnd) : null,
          seasonId: program.seasonId || undefined,
        });
    }
  }, [program, programForm]);


  const handleAddQuestion = () => {
    setEditingQuestion(null);
    questionForm.resetFields();
    setQuestionModalVisible(true);
  };

  const handleEditQuestion = (question: ProgramQuestion) => {
    setEditingQuestion(question);
    questionForm.setFieldsValue(question);
    setQuestionModalVisible(true);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!program) return;
    const updatedQuestions = (program.questions || []).filter(q => q.id !== questionId);
    setProgram({ ...program, questions: updatedQuestions });
    message.success('Question deleted');
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    if (!program) return;
    const questions = [...(program.questions || [])];
    const index = questions.findIndex(q => q.id === questionId);
    
    if (direction === 'up' && index > 0) {
      [questions[index], questions[index - 1]] = [questions[index - 1], questions[index]];
    } else if (direction === 'down' && index < questions.length - 1) {
      [questions[index], questions[index + 1]] = [questions[index + 1], questions[index]];
    }
    
    // Update order numbers
    questions.forEach((q, i) => q.order = i);
    setProgram({ ...program, questions });
  };

  const handleQuestionSubmit = (values: any) => {
    if (!program) return;
    
    const questionData: ProgramQuestion = {
      id: editingQuestion?.id || `q_${Date.now()}`,
      type: values.type,
      title: values.title,
      description: values.description || undefined,
      required: values.required === true,
      options: values.options && values.options.length > 0 ? values.options : undefined,
      waiverText: values.waiverText || undefined,
      order: editingQuestion?.order ?? (program.questions || []).length,
    };

    let updatedQuestions;
    if (editingQuestion) {
      updatedQuestions = (program.questions || []).map(q => 
        q.id === editingQuestion.id ? questionData : q
      );
    } else {
      updatedQuestions = [...(program.questions || []), questionData];
    }

    setProgram({ ...program, questions: updatedQuestions });
    setQuestionModalVisible(false);
    questionForm.resetFields();
    message.success(editingQuestion ? 'Question updated' : 'Question added');
  };

  const getQuestionTypeOptions = () => [
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkboxes', label: 'Checkboxes' },
    { value: 'file_upload', label: 'Upload File' },
    { value: 'waiver', label: 'Waiver' },
  ];

  if (loading || !program) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Space orientation="vertical" style={{ flex: 1 }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/programs')}>
                Back to Programs
              </Button>
              <div>
                <Title level={2} style={{ margin: 0 }}>{program.name}</Title>
                <Text type="secondary">Program Form Configuration</Text>
              </div>
            </Space>
            <Space>
              <Button onClick={() => navigate(`/admin/programs/${program.id}/teams`)}>
                Manage Teams
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => {
                programForm.submit();
              }}>
                Save Program
              </Button>
            </Space>
          </Space>
        </div>

        <Card title="Program Details" style={{ marginBottom: '24px' }}>
          <Form form={programForm} layout="vertical" onFinish={(values) => {
            if (!program) return;
            
            // Convert female toggle to sexRestriction
            const sexRestriction = values.femaleOnlyToggle ? 'female' : 'any';
            
            // Clean questions - remove undefined/null values from each question
            const cleanedQuestions = (program.questions || []).map(q => {
              const cleanedQuestion: any = {
                id: q.id,
                type: q.type,
                title: q.title,
                required: q.required === true,
                order: q.order,
              };
              
              // Only add optional fields if they have values
              if (q.description) cleanedQuestion.description = q.description;
              if (q.options && q.options.length > 0) cleanedQuestion.options = q.options;
              if (q.waiverText) cleanedQuestion.waiverText = q.waiverText;
              
              return cleanedQuestion;
            });
            
            const updatedProgram = {
              ...program,
              ...values,
              sexRestriction,
              questions: cleanedQuestions,
              registrationStart: values.registrationStart?.format('YYYY-MM-DD'),
              registrationEnd: values.registrationEnd?.format('YYYY-MM-DD'),
              birthDateStart: values.birthDateStart?.format('YYYY-MM-DD'),
              birthDateEnd: values.birthDateEnd?.format('YYYY-MM-DD'),
            };
            
            // Handle async save without blocking form submission
            programsService.updateProgram(program.id, {
              ...updatedProgram,
              updatedAt: new Date().toISOString(),
            })
              .then(() => {
                setProgram(updatedProgram);
                message.success('Program updated successfully!');
              })
              .catch((error) => {
                console.error('❌ Error saving program:', error);
                message.error('Failed to save program');
              });
          }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="Program Name" rules={[{ required: true }]}>
                  <Input placeholder="Enter program name" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="active" label="Active" valuePropName="checked">
                  <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="femaleOnlyToggle" label="Female Only" valuePropName="checked">
                  <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="seasonId" label="Season">
                  <Select placeholder="Select season">
                    <Select.Option value={undefined}>None</Select.Option>
                    {seasons.map(s => (
                      <Select.Option key={s.id} value={s.id}>{s.name} {s.status === 'archived' ? '(Archived)' : ''}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item name="description" label="Description">
              <TextArea rows={3} placeholder="Program description" />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="registrationStart" label="Registration Start">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="registrationEnd" label="Registration End">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="birthDateStart" label="Birth Date Start">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="birthDateEnd" label="Birth Date End">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => 
                    prevValues.birthDateStart !== currentValues.birthDateStart ||
                    prevValues.allowGradeExemption !== currentValues.allowGradeExemption
                  }
                >
                  {({ getFieldValue }) => {
                    const allowGradeExemption = getFieldValue('allowGradeExemption');
                    const birthDateStart = getFieldValue('birthDateStart');
                    
                    // Auto-set max grade when birth date start changes and grade exemptions are enabled
                    if (allowGradeExemption && birthDateStart) {
                      const now = dayjs();
                      const currentYear = now.year();
                      const isBeforeAugust = now.month() < 7; // January to July (months 0-6)
                      const schoolYear = isBeforeAugust ? currentYear - 1 : currentYear;
                      
                      const calculatedMaxGrade = schoolYear - dayjs(birthDateStart).year() - 6;
                      if (calculatedMaxGrade >= 0 && calculatedMaxGrade <= 12) {
                        setTimeout(() => {
                          programForm.setFieldsValue({ maxGrade: calculatedMaxGrade });
                        }, 0);
                      }
                    }
                    
                    return (
                      <Form.Item name="maxGrade" label="Maximum Grade">
                        <Select 
                          style={{ width: '100%' }} 
                          placeholder="Select grade"
                        >
                          <Select.Option value={0}>Kindergarten</Select.Option>
                          <Select.Option value={1}>1st Grade</Select.Option>
                          <Select.Option value={2}>2nd Grade</Select.Option>
                          <Select.Option value={3}>3rd Grade</Select.Option>
                          <Select.Option value={4}>4th Grade</Select.Option>
                          <Select.Option value={5}>5th Grade</Select.Option>
                          <Select.Option value={6}>6th Grade</Select.Option>
                          <Select.Option value={7}>7th Grade</Select.Option>
                          <Select.Option value={8}>8th Grade</Select.Option>
                          <Select.Option value={9}>9th Grade</Select.Option>
                          <Select.Option value={10}>10th Grade</Select.Option>
                          <Select.Option value={11}>11th Grade</Select.Option>
                          <Select.Option value={12}>12th Grade</Select.Option>
                        </Select>
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="allowGradeExemption" label="Allow Grade Exemptions" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card title="Registration Form Questions" 
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQuestion}>
                  Add Question
            </Button>
          }>
          <Table
            dataSource={(program.questions || []).sort((a, b) => a.order - b.order)}
            locale={{ emptyText: 'No questions added yet. Click "Add Question" to get started.' }}
            pagination={false}
            rowKey="id"
            columns={[
              {
                title: 'Question',
                key: 'question',
                render: (question: any) => (
                  <div>
                    <Space>
                      <Text strong>{question.title}</Text>
                      {question.required && <Text type="danger">*</Text>}
                      <Text type="secondary">({question.type.replace('_', ' ')})</Text>
                    </Space>
                    {question.description && <div><Text type="secondary">{question.description}</Text></div>}
                  </div>
                ),
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 200,
                render: (question: any, _record: any, index: number) => (
                  <Space>
                    <Button 
                      size="small" 
                      icon={<ArrowUpOutlined />} 
                      disabled={index === 0}
                      onClick={() => { handleMoveQuestion(question.id, 'up'); }}
                    />
                    <Button 
                      size="small" 
                      icon={<ArrowDownOutlined />} 
                      disabled={index === (program.questions || []).length - 1}
                      onClick={() => { handleMoveQuestion(question.id, 'down'); }}
                    />
                    <Button 
                      size="small" 
                      icon={<EditOutlined />} 
                      onClick={() => { handleEditQuestion(question); }}
                    />
                    <Popconfirm
                      title="Delete Question"
                      description="Are you sure you want to delete this question?"
                      onConfirm={() => { handleDeleteQuestion(question.id); }}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Modal
          title={editingQuestion ? 'Edit Question' : 'Add Question'}
          open={questionModalVisible}
          onCancel={() => {
            setQuestionModalVisible(false);
            questionForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form form={questionForm} layout="vertical" onFinish={handleQuestionSubmit}>
            <Form.Item name="type" label="Question Type" rules={[{ required: true }]}>
              <Select placeholder="Select question type" options={getQuestionTypeOptions()} />
            </Form.Item>

            <Form.Item name="title" label="Question Title" rules={[{ required: true }]}>
              <Input placeholder="e.g., What school does the player attend?" />
            </Form.Item>

            <Form.Item name="description" label="Description (Optional)">
              <TextArea rows={2} placeholder="Additional instructions or context..." />
            </Form.Item>

            <Form.Item name="required" label="Required" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
            >
              {({ getFieldValue }) => {
                const questionType = getFieldValue('type');
                if (questionType === 'dropdown' || questionType === 'checkboxes') {
                  return (
                    <Form.Item name="options" label="Options" rules={[{ required: true }]}>
                      <Select
                        mode="tags"
                        placeholder="Type options and press Enter"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  );
                }
                if (questionType === 'waiver') {
                  return (
                    <Form.Item name="waiverText" label="Waiver Text" rules={[{ required: true }]}>
                      <TextArea rows={4} placeholder="Enter the legal agreement text..." />
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setQuestionModalVisible(false);
                  questionForm.resetFields();
                }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}