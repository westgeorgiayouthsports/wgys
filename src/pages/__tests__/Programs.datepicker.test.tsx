import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import dayjs from 'dayjs';
import Programs from '../Programs';

// Use a reasonable global timeout if you like
jest.setTimeout(20000);

// ---- Mocks ----
// Mock Ant Design DatePicker with an input that understands Dayjs values
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  const React = require('react');
  const dayjs = require('dayjs');
  function DatePickerMock(props: any) {
    const { value, onChange, placeholder, ...rest } = props;
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
// Stub Ant Design message API so it doesn't schedule updates that trigger act() warnings
jest.mock('antd/lib/message', () => ({
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
}));
// Mock firebasePrograms used by Programs
jest.mock('../../services/firebasePrograms', () => ({
  programsService: {
    getPrograms: jest.fn(async () => []), // no-op list load
    createProgram: jest.fn(async (programData: any, createdBy: string) => 'new-program-id'),
    updateProgram: jest.fn(),
    deleteProgram: jest.fn(),
  },
}));

// Mock react-redux selector
jest.mock('react-redux', () => ({
  useSelector: (fn: any) => fn({ auth: { role: 'admin', user: { uid: 'u1' } } }),
}));

describe('Programs datepicker persistence', () => {
  test('setFieldsValue can set date fields and submit', async () => {
    // Use ref to access form instance
    const ref = React.createRef<any>();
    render(
      <BrowserRouter>
        <Programs ref={ref} />
      </BrowserRouter>,
    );

    // Wait for Add Program button to appear
    const addButton = await screen.findByRole('button', { name: /Add Program/i });
    expect(addButton).toBeInTheDocument();
    await userEvent.click(addButton);
    await screen.findByLabelText(/Program Name/i, {}, { timeout: 5000 });

    // Set all fields programmatically
    act(() => {
      ref.current.form.setFieldsValue({
        name: 'Test Program',
        sport: 'baseball',
        sexRestriction: 'coed',
        basePrice: 25.00,
        registrationStart: dayjs('2025-01-01'),
        registrationEnd: dayjs('2025-01-31'),
        birthDateStart: dayjs('2010-01-01'),
        birthDateEnd: dayjs('2015-12-31'),
      });
    });

    // Submit the form
    const createButton = await screen.findByRole('button', { name: /Create Program/i });
    await userEvent.click(createButton);

    // Check that createProgram service was called
    const { programsService } = require('../../services/firebasePrograms');
    await waitFor(() => expect(programsService.createProgram).toHaveBeenCalled(), { timeout: 3000 });

    // Verify it was called with the expected data
    expect(programsService.createProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Program',
        basePrice: 25.00,
        birthDateStart: expect.anything(),
        birthDateEnd: expect.anything(),
      }),
      expect.any(String)
    );
  }, 30000);
});
