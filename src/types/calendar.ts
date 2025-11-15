export interface CalendarEvent {
  id?: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  meetingLink?: string;
  createdAt?: string;
}
