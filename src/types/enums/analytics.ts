export const ViewsSourceValues = {
  standard: 'standard',
  eventCount: 'eventCount',
  realtime: 'realtime',
} as const;
export type ViewsSource = typeof ViewsSourceValues[keyof typeof ViewsSourceValues];
