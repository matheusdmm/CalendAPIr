import { z } from 'zod';

//HH:MM (ex: 09:30, 23:59)
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const CalendarEventSchema = z.object({
  title: z.string().min(3, 'Minimum 3 Characteres for title.').max(100),
  description: z.string().max(500).optional(),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD.'),

  startTime: z
    .string()
    .regex(timeRegex, 'Start time must be in format HH:MM (24h).'),
  endTime: z
    .string()
    .regex(timeRegex, 'End time must be in format HH:MM (24h).'),

  meetingLink: z.string().url('Must be a valid URL.').optional(),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
