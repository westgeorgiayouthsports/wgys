import React from 'react';

// Simple input mock for DatePicker
export function DatePickerMock(props: any) {
  return <input {...props} type="text" data-testid={props['data-testid'] || 'datepicker-mock'} />;
}
