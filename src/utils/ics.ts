import type { CalendarEvent } from '../types/validationSchema.js';
import type { CalendarEventRow } from '../types/calendar.js';

interface RawVEvent {
  dtstart?: string;
  dtend?: string;
  summary?: string;
  description?: string;
  url?: string;
  uid?: string;
}

function unfoldLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .filter((l) => l.trim().length > 0);
}

function parseDateTime(value: string): { date: string; time: string } | null {
  const dt = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (dt) {
    return { date: `${dt[1]}-${dt[2]}-${dt[3]}`, time: `${dt[4]}:${dt[5]}` };
  }
  const d = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (d) {
    return { date: `${d[1]}-${d[2]}-${d[3]}`, time: '00:00' };
  }
  return null;
}

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toCalendarEvent(raw: RawVEvent): CalendarEvent | null {
  if (!raw.dtstart || !raw.summary) return null;

  const start = parseDateTime(raw.dtstart);
  if (!start) return null;

  let endTime = start.time === '00:00' ? '23:59' : addOneHour(start.time);
  if (raw.dtend) {
    const end = parseDateTime(raw.dtend);
    if (end) endTime = end.time;
  }

  if (endTime <= start.time) endTime = addOneHour(start.time);

  const event: CalendarEvent = {
    title: raw.summary.slice(0, 100),
    date: start.date,
    startTime: start.time,
    endTime,
  };

  if (raw.description) {
    event.description = raw.description
      .replace(/\\n/g, ' ')
      .replace(/\\,/g, ',')
      .replace(/\\\\/g, '\\')
      .slice(0, 500);
  }

  if (raw.url) {
    try {
      new URL(raw.url);
      event.meetingLink = raw.url;
    } catch {
      // invalid URL — skip
    }
  }

  return event;
}

export function parseICS(icsText: string): CalendarEvent[] {
  const lines = unfoldLines(icsText);
  const events: CalendarEvent[] = [];
  let current: RawVEvent | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue; }
    if (line === 'END:VEVENT') {
      if (current) {
        const ev = toCalendarEvent(current);
        if (ev) events.push(ev);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const prop = line.slice(0, colon).split(';')[0].toUpperCase();
    const val = line.slice(colon + 1);

    switch (prop) {
      case 'DTSTART': current.dtstart = val; break;
      case 'DTEND': current.dtend = val; break;
      case 'SUMMARY': current.summary = val; break;
      case 'DESCRIPTION': current.description = val; break;
      case 'URL': current.url = val; break;
      case 'UID': current.uid = val; break;
    }
  }

  return events;
}

function foldLine(value: string): string {
  if (value.length <= 73) return value;
  const chunks: string[] = [];
  let remaining = value;
  let first = true;
  while (remaining.length > 0) {
    const limit = first ? 73 : 72;
    chunks.push(remaining.slice(0, limit));
    remaining = remaining.slice(limit);
    first = false;
  }
  return chunks.join('\r\n ');
}

export function generateICS(events: CalendarEventRow[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CalendAPIr//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    const dtstart = `${ev.date.replace(/-/g, '')}T${ev.startTime.replace(':', '')}00`;
    const dtend = `${ev.date.replace(/-/g, '')}T${ev.endTime.replace(':', '')}00`;
    const dtstamp = new Date(ev.createdAt).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@calendapir`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`SUMMARY:${foldLine(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${foldLine(ev.description.replace(/\n/g, '\\n'))}`);
    }
    if (ev.meetingLink) lines.push(`URL:${ev.meetingLink}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
