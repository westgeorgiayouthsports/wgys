import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Table,
  DatePicker,
  Select,
  Space,
  Alert,
  Divider,
  Tag,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

export default function RegistrationHelp() {
  const [searchParams] = useSearchParams();
  
  const [selectedSport, setSelectedSport] = useState<string>(() => {
    const sex = searchParams.get('sex');
    return sex === 'female' ? 'softball' : 'baseball';
  });
  
  const [seasonDate, setSeasonDate] = useState(() => {
    const now = dayjs();
    const isAfterAugust = now.month() >= 7;
    const year = isAfterAugust ? now.year() + 1 : now.year();
    const sex = searchParams.get('sex');
    const sport = sex === 'female' ? 'softball' : 'baseball';
    const month = sport === 'softball' ? 0 : 4; // January 1 for softball, May 1 for baseball
    return dayjs().year(year).month(month).date(1);
  });

  const [selectedBirthDate, setSelectedBirthDate] = useState<dayjs.Dayjs | null>(() => {
    const dateOfBirth = searchParams.get('dateOfBirth');
    return dateOfBirth ? dayjs(dateOfBirth) : null;
  });

  // Update season date when sport changes
  const updateSeasonDateForSport = (sport: string) => {
    const now = dayjs();
    const isAfterAugust = now.month() >= 7;
    const year = isAfterAugust ? now.year() + 1 : now.year();
    const month = sport === 'softball' ? 0 : 4; // January 1 for softball, May 1 for baseball
    setSeasonDate(dayjs().year(year).month(month).date(1));
  };

  const calculateSeasonAge = (birthDate: dayjs.Dayjs): number => {
    let age = seasonDate.year() - birthDate.year();
    if (seasonDate.month() < birthDate.month() || 
        (seasonDate.month() === birthDate.month() && seasonDate.date() <= birthDate.date())) {
      age--;
    }
    return age;
  };

  const generateAgeGroups = () => {
    const groups = [];
    for (let age = 3; age <= 18; age++) {
      const fromDate = seasonDate.clone().subtract(age + 1, 'year');
      const toDate = seasonDate.clone().subtract(age, 'year').subtract(1, 'day');
      
      groups.push({
        ageGroup: `${age}U`,
        age,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
        fromDateDisplay: fromDate.format('MMM D, YYYY'),
        toDateDisplay: toDate.format('MMM D, YYYY'),
      });
    }
    return groups;
  };

  const ageGroups = generateAgeGroups();
  
  const getEligibleAgeGroup = () => {
    if (!selectedBirthDate) return null;
    
    const birthDateStr = selectedBirthDate.format('YYYY-MM-DD');
    return ageGroups.find(group => 
      birthDateStr >= group.fromDate && birthDateStr <= group.toDate
    );
  };

  const eligibleGroup = getEligibleAgeGroup();
  const seasonAge = selectedBirthDate ? calculateSeasonAge(selectedBirthDate) : null;

  const columns = [
    {
      title: 'Age Division',
      dataIndex: 'ageGroup',
      key: 'ageGroup',
      render: (text: string, record: any) => (
        <Tag color={eligibleGroup?.ageGroup === text ? 'green' : 'default'}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Season Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Birth Date Range',
      key: 'dateRange',
      render: (record: any) => (
        <div>
          <div><strong>From:</strong> {record.fromDateDisplay}</div>
          <div><strong>To:</strong> {record.toDateDisplay}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
        <Title level={2}>Registration Help</Title>
        <Paragraph>
          Use this tool to understand which age group your athlete belongs to based on their birth date, 
          sex, and grade level. Age divisions are determined by the athlete's age on the season control date.
        </Paragraph>

        <Card title="Age Group Calculator" style={{ marginBottom: '24px' }}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Space size="large" wrap>
              <div>
                <Text strong>Sport:</Text>
                <br />
                <Select
                  value={selectedSport}
                  onChange={(sport) => {
                    setSelectedSport(sport);
                    updateSeasonDateForSport(sport);
                  }}
                  style={{ width: 120 }}
                >
                  <Select.Option value="baseball">Baseball</Select.Option>
                  <Select.Option value="softball">Softball</Select.Option>
                </Select>
              </div>
              
              <div>
                <Text strong>Season Control Date:</Text>
                <br />
                <DatePicker
                  value={seasonDate}
                  onChange={(date) => date && setSeasonDate(date)}
                  format="MMMM D, YYYY"
                />
              </div>
              
              <div>
                <Text strong>Athlete's Birth Date:</Text>
                <br />
                <DatePicker
                  value={selectedBirthDate}
                  onChange={setSelectedBirthDate}
                  format="MMMM D, YYYY"
                  placeholder="Select birth date"
                />
              </div>
            </Space>

            {selectedBirthDate && (
              <Alert
                title={
                  eligibleGroup ? (
                    <div>
                      <strong>Eligible Age Group: {eligibleGroup.ageGroup}</strong>
                      <br />
                      Season Age: {seasonAge} years old
                      <br />
                      Birth Date Range: {eligibleGroup.fromDateDisplay} to {eligibleGroup.toDateDisplay}
                      <br />
                      <strong>Grade Exemption (if applicable):</strong> {eligibleGroup.age - 6}th grade or graduation year {seasonDate.year() + 18 - eligibleGroup.age}
                    </div>
                  ) : (
                    <div>
                      <strong>No eligible age group found</strong>
                      <br />
                      The selected birth date doesn't fall within any standard age division.
                    </div>
                  )
                }
                type={eligibleGroup ? 'success' : 'warning'}
                icon={<InfoCircleOutlined />}
              />
            )}
          </Space>
        </Card>

        <Card title={`${seasonDate.year()} Age Divisions`}>
          <Paragraph>
            <Text type="secondary">
              Athletes must be born between the "From" and "To" dates to be eligible for each age division.
              Age is calculated as of the season control date ({seasonDate.format('MMMM D, YYYY')}).
            </Text>
          </Paragraph>
          
          <Table
            columns={columns}
            dataSource={ageGroups}
            rowKey="ageGroup"
            pagination={false}
            size="small"
          />
        </Card>

        <Card title="Important Notes" style={{ marginTop: '24px' }}>
          <Space orientation="vertical" size="middle">
            <div>
              <Title level={4}>Sex Restrictions</Title>
              <Paragraph>
                Some programs may have sex restrictions:
                <ul>
                  <li><strong>Co-ed:</strong> Open to male or female athletes</li>
                  <li><strong>Male Only:</strong> Restricted to male athletes</li>
                  <li><strong>Female Only:</strong> Restricted to female athletes (e.g., softball)</li>
                </ul>
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>Grade Eligibility</Title>
              <Paragraph>
                Some programs may also have grade exemptions in addition to age restrictions:
                <ul>
                  <li>Programs may specify minimum and maximum grade levels</li>
                  <li>Grade exemptions may be available for certain programs</li>
                  <li>Contact the program administrator if you need a grade exemption</li>
                </ul>
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>Season Control Date</Title>
              <Paragraph>
                The season control date is used to determine an athlete's "season age" - their age as of this specific date.
                This ensures fair competition by grouping athletes who will be similar ages throughout the season.
                The age control date for baseball is typically May 1st, but may vary by program.
              </Paragraph>
            </div>
          </Space>
        </Card>
    </div>
  );
}