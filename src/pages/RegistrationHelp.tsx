import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Table,
  DatePicker,
  Select,
  Space,
  Alert,
  Tag,
  Collapse,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { sportsService } from '../services/firebaseSports';
import { getAgeControlDateForSeason, DEFAULT_SPORT_AGE_CONTROL } from '../utils/season';
import { parseDateStringToDayjs, localDayjsFromUTCDate } from '../utils/dateHelpers';
import logger from '../utils/logger';


const { Title, Text, Paragraph } = Typography;

export default function RegistrationHelp({ compact = false }: { compact?: boolean }) {
  const [searchParams] = useSearchParams();

  const [selectedSportId, setSelectedSportId] = useState<string | null>(() => {
    const sex = searchParams.get('sex');
    return sex === 'female' ? 'softball' : 'baseball';
  });

  const [sports, setSports] = useState<Array<{ id?: string; name?: string; ageControlDate?: string }>>([]);

  const [seasonDate, setSeasonDate] = useState(() => {
    const now = dayjs();
    const isAfterAugust = now.month() >= 7;
    const sex = searchParams.get('sex');
    const sport = sex === 'female' ? 'softball' : 'baseball';
    // Use util to compute control date; fallback to previous behavior when util not present
    try {
      const term = isAfterAugust ? 'fall' : 'spring';
      // compute control date for this year first, then decide whether to use next year
      const ctrlThisYear = getAgeControlDateForSeason({ term: term as any, year: now.year() }, sport);
      const ctrlThisLocal = localDayjsFromUTCDate(ctrlThisYear);
      const useYear = now.isAfter(dayjs().year(now.year()).month(ctrlThisLocal.month()).date(ctrlThisLocal.date())) ? now.year() + 1 : now.year();
      const controlDate = getAgeControlDateForSeason({ term: term as any, year: useYear }, sport);
      return localDayjsFromUTCDate(controlDate);
    } catch (e) {
      logger.error('Error computing control date from registration util', e);
      const key = (sport || '').toLowerCase();
      const md = DEFAULT_SPORT_AGE_CONTROL[key] ?? DEFAULT_SPORT_AGE_CONTROL.default;
      const controlThisYear = dayjs().year(now.year()).month(md.month).date(md.day);
      const useYear = now.isAfter(controlThisYear) ? now.year() + 1 : now.year();
      return dayjs().year(useYear).month(md.month).date(md.day);
    }
  });

  const [selectedBirthDate, setSelectedBirthDate] = useState<dayjs.Dayjs | null>(() => {
    const dateOfBirth = searchParams.get('dateOfBirth');
    return dateOfBirth ? dayjs(dateOfBirth) : null;
  });

  // Update season date when sport changes
  // This is necessary for baseball & softball because players are required to move up in age group during fall season
  // The yearly sport cycle technically goes from August 16 to August 15
  const updateSeasonDateForSport = (sportName: string) => {
    const now = dayjs();
    const isAfterAugust = now.month() >= 7;
    // prefer sports table value when available
    try {
      const term = isAfterAugust ? 'fall' : 'spring';
      // find sport record by id or name
      const sport = (sports || []).find(s => s.id === sportName || (s.name || '').toLowerCase() === (sportName || '').toLowerCase());
      // compute control date for this year and decide if we should use next year
      const ctrlThisYear = getAgeControlDateForSeason({ term: term as any, year: now.year() }, sport ?? sportName);
      const ctrlThisLocal = localDayjsFromUTCDate(ctrlThisYear);
      const useYear = now.isAfter(dayjs().year(now.year()).month(ctrlThisLocal.month()).date(ctrlThisLocal.date())) ? now.year() + 1 : now.year();
      const controlDate = getAgeControlDateForSeason({ term: term as any, year: useYear }, sport ?? sportName);
      setSeasonDate(localDayjsFromUTCDate(controlDate));
      return;
    } catch (e) {
      logger.error('Error computing age control date from registration util', e);
      const key = (sportName || '').toLowerCase().replace(/\s+/g, '_');
      const md = DEFAULT_SPORT_AGE_CONTROL[key] ?? DEFAULT_SPORT_AGE_CONTROL.default;
      const controlThisYear = dayjs().year(now.year()).month(md.month).date(md.day);
      const useYear = now.isAfter(controlThisYear) ? now.year() + 1 : now.year();
      setSeasonDate(dayjs().year(useYear).month(md.month).date(md.day));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const s = await sportsService.getSports();
        const sorted = (s || []).slice().sort((a: any, b: any) => {
          const na = (a?.name || '').toLowerCase();
          const nb = (b?.name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        });
        setSports(sorted);
        const sex = searchParams.get('sex');
        const defaultName = sex === 'female' ? 'softball' : 'baseball';
        const found = (s || []).find((sp: any) => (sp.name || '').toLowerCase().includes(defaultName));
        if (found) setSelectedSportId(found.id || found.name || defaultName);
      } catch (e) {
        logger.error('Error loading sports', e);
      }
    })();
  }, []);

  const compactMode = !!compact;

  // Compute the display/school year from the season control date (no selectable dropdown)
  // Default to next year when the season control month/day for the current year has already passed
  const now = dayjs();
  const controlThisYear = dayjs().year(now.year()).month(seasonDate.month()).date(seasonDate.date());
  const displayYear = now.isAfter(controlThisYear) ? now.year() + 1 : now.year();
  const controlAnchor = seasonDate.clone().year(displayYear);

  const calculateSeasonAge = (birthDate: dayjs.Dayjs): number => {
    let age = controlAnchor.year() - birthDate.year();
    if (controlAnchor.month() < birthDate.month() ||
        (controlAnchor.month() === birthDate.month() && controlAnchor.date() <= birthDate.date())) {
      age--;
    }
    return age;
  };

  const generateAgeGroups = () => {
    const groups = [];
    for (let age = 3; age <= 18; age++) {
      const fromDate = controlAnchor.clone().subtract(age + 1, 'year');
      const toDate = controlAnchor.clone().subtract(age, 'year').subtract(1, 'day');

      groups.push({
        ageGroup: `${age}U`,
        age,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
        fromDateDisplay: fromDate.locale('en').format('MMM D, YYYY'),
        toDateDisplay: toDate.locale('en').format('MMM D, YYYY'),
        gradYear: controlAnchor.year() + 18 - age,
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
      title: 'Division',
      dataIndex: 'ageGroup',
      key: 'ageGroup',
      render: (text: string, _record: any) => (
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
      title: 'Grade Exemption',
      key: 'gradeExemption',
      render: (_: any, record: any) => {
        const age = record.age;
        const grade = age - 6;
        if (grade < 0) return '';
        return grade === 0 ? 'K' : grade;
      }
    },
    {
      title: 'Graduation Year',
      key: 'gradYear',
      render: (_: any, record: any) => {
        const grade = record.age - 6;
        return grade < 0 ? '' : record.gradYear;
      }
    },
    {
      title: 'Born on/after',
      dataIndex: 'fromDateDisplay',
      key: 'fromDateDisplay',
    },
    {
      title: 'Born on/before',
      dataIndex: 'toDateDisplay',
      key: 'toDateDisplay',
    },
  ];

  // yearOptions removed; display year shown instead of a dropdown

  return (
    <div className={compactMode ? 'page-container compact-help' : 'page-container'}>
      <Title level={compactMode ? 4 : 2}>Registration Help</Title>
      <Paragraph>
          Use this tool to understand which age group your athlete belongs to based on their birth date,
          sex, and grade level. Age divisions are determined by the athlete's age on the season control date.
      </Paragraph>

      <Card title="Age Group Calculator" style={{ marginBottom: compactMode ? '12px' : '24px' }} styles={{ body: compactMode ? { padding: 8 } : undefined }}>
        <Space orientation="vertical" size={compactMode ? 'small' : 'large'} style={{ width: '100%' }}>
          <Space size={compactMode ? 'small' : 'large'} wrap>
            <div>
              <Text strong>Sport:</Text>
              <br />
              <Select
                value={selectedSportId ?? undefined}
                onChange={(sportId) => {
                  setSelectedSportId(sportId);
                  updateSeasonDateForSport(sportId);
                }}
                size={compactMode ? 'small' : undefined}
                style={{ width: 200 }}
                placeholder="Select sport"
              >
                {sports.map((sp) => (
                  <Select.Option key={sp.id || sp.name} value={sp.id || sp.name}>
                    {sp.name}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong>Season Control Date:</Text>
              <br />
              <DatePicker
                value={seasonDate}
                allowClear={false}
                size={compactMode ? 'small' : undefined}
                onChange={(date, dateString) => {
                  if (date) return setSeasonDate(date);
                  const parsed = parseDateStringToDayjs(dateString);
                  if (parsed) setSeasonDate(parsed);
                }}
                format={['MMMM D, YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']}
              />
            </div>

            <div>
              <Text strong>Athlete's Birth Date:</Text>
              <br />
              <DatePicker
                value={selectedBirthDate}
                allowClear={false}
                size={compactMode ? 'small' : undefined}
                onChange={(date, dateString) => {
                  if (date) return setSelectedBirthDate(date);
                  const parsed = parseDateStringToDayjs(dateString);
                  if (parsed) setSelectedBirthDate(parsed);
                }}
                format={['MMMM D, YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']}
                placeholder="Select birth date"
              />
            </div>
          </Space>

          {selectedBirthDate && (
            <Alert
              title={
                eligibleGroup ? (
                  compactMode ? (
                    <div>
                      <strong>{eligibleGroup.ageGroup}</strong> — {eligibleGroup.fromDateDisplay} to {eligibleGroup.toDateDisplay}
                    </div>
                  ) : (
                    <div>
                      <strong>Eligible Age Group: {eligibleGroup.ageGroup}</strong>
                      <br />
                        Season Age: {seasonAge} years old
                      <br />
                        Birth Date Range: {eligibleGroup.fromDateDisplay} to {eligibleGroup.toDateDisplay}
                      <br />
                      <strong>Grade Exemption (if applicable):</strong> {eligibleGroup.age - 6}th grade or graduation year {controlAnchor.year() + 18 - eligibleGroup.age}
                    </div>
                  )
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

      <Card
        title={<span>{' '}
          <span style={{ marginRight: 8 }}>Age Divisions (school year):</span>
          <span style={{ fontWeight: 600 }}>{`${displayYear - 1}-${displayYear}`}</span>
        </span>}
        style={compactMode ? { padding: 8 } : undefined}
      >
        <Paragraph>
          <Text type="secondary">
              Athletes must be born between the "Born on/after" and "Born on/before" dates to be eligible for each age division.
              Age is calculated as of the season control date ({seasonDate.locale('en').format('MMMM D, YYYY')}).
          </Text>
        </Paragraph>

        <div style={{ display: 'block', width: '100%', padding: 0 }}>
          <Table
            columns={columns}
            dataSource={ageGroups}
            rowKey="ageGroup"
            pagination={false}
            size={compactMode ? 'small' : 'small'}
            tableLayout="auto"
            style={{ width: 'auto', whiteSpace: 'nowrap', minWidth: 'max-content' }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </Card>

      <Card title="Important Notes" style={{ marginTop: compactMode ? '8px' : '24px' }} styles={{ body: compactMode ? { padding: 8 } : undefined }}>
        <Collapse defaultActiveKey={compactMode ? [] : ['1']} ghost items={[
          {
            key: '1',
            label: 'Sex Restrictions',
            children: (
              <Paragraph>
                Some programs may have sex restrictions: Co-ed / Male Only / Female Only (e.g., softball).
              </Paragraph>
            ),
          },
          {
            key: '2',
            label: 'Grade Eligibility',
            children: (
              <Paragraph>
                Some programs may also have grade exemptions in addition to age restrictions. Contact the program administrator for exemptions.
              </Paragraph>
            ),
          },
          {
            key: '3',
            label: 'Season Control Date',
            children: (
              <Paragraph>
                The season control date is used to determine an athlete's "season age" — the age as of this specific date. The age control date for baseball is typically May 1st.
              </Paragraph>
            ),
          },
        ]} />
      </Card>
    </div>
  );
}