import { render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { BrowserRouter } from 'react-router-dom';

jest.setTimeout(20000);

// Mock Ant Design DatePicker like other tests
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  const React = require('react');
  const dayjs = require('dayjs');
  function DatePickerMock(props: any) {
    const { value, onChange, placeholder, _allowClear, _size, _format, ...rest } = props;
    const display = value && typeof value === 'object' && typeof value.format === 'function'
      ? value.format('YYYY-MM-DD')
      : value ?? '';
    return (
      React.createElement('input', {
        ...rest,
        type: 'text',
        placeholder,
        value: display,
        'data-testid': rest['data-testid'] || 'datepicker-mock',
        onChange: (e: any) => {
          const v = e.target.value;
          if (onChange) onChange(dayjs(v));
        },
      })
    );
  }
  return {
    ...antd,
    DatePicker: DatePickerMock,
  };
});

jest.mock('antd/lib/message', () => ({
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
}));

// Mock sports service
jest.mock('../../services/firebaseSports', () => ({
  sportsService: {
    getSports: jest.fn(async () => [
      { id: 'baseball-id', name: 'Baseball', ageControlDate: '05-01' },
      { id: 'softball-id', name: 'Softball', ageControlDate: '01-01' },
    ]),
  },
}));

import RegistrationHelp from '../RegistrationHelp';
import { getAgeControlDateForSeason } from '../../utils/season';

describe('RegistrationHelp age control integration', () => {
  test('shows season control date from sports table for default sport', async () => {
    render(
      <BrowserRouter>
        <RegistrationHelp />
      </BrowserRouter>
    );

    // Wait for the mocked DatePicker inputs to appear (there are multiple DatePickers)
    const inputs = await screen.findAllByTestId('datepicker-mock');
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    // Compute expected control date based on current date and sport mapping
    const now = dayjs();
    const isAfterAugust = now.month() >= 7;
    const year = isAfterAugust ? now.year() + 1 : now.year();
    const term = isAfterAugust ? 'fall' : 'spring';
    const ctrl = getAgeControlDateForSeason({ term: term as any, year }, 'Baseball');
    const ctrlDt = new Date(ctrl as any);
    const expected = dayjs().year(ctrlDt.getUTCFullYear()).month(ctrlDt.getUTCMonth()).date(ctrlDt.getUTCDate()).format('YYYY-MM-DD');

    // Find any DatePicker mock whose value matches the expected control date
    await waitFor(() => {
      const found = inputs.find((el: any) => (el as HTMLInputElement).value === expected);
      expect(found).toBeDefined();
    }, { timeout: 2000 });
  });
});
