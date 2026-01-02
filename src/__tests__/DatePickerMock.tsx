// Simple input mock for DatePicker
export function DatePickerMock(props: any) {
  const { value, onChange, placeholder, "data-testid": dataTestId, _allowClear, _size, _format, ...rest } = props as any;
  const display = value && typeof value === 'object' && typeof value.format === 'function'
    ? value.format('YYYY-MM-DD')
    : value ?? '';
  return (
    <input
      {...rest}
      type="text"
      placeholder={placeholder}
      value={display}
      data-testid={dataTestId || 'datepicker-mock'}
      onChange={(e: any) => onChange && onChange(e.target.value)}
    />
  );
}
