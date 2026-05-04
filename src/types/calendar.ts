export interface CalendarEventRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  meetingLink?: string;
  createdAt: string;
}
