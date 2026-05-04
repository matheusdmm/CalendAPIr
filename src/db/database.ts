import duckdb from 'duckdb';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEventRow } from '../types/calendar.js';
import type { CalendarEvent } from '../types/validationSchema.js';

const DB_PATH = process.env.DB_PATH || 'calendar.duckdb';
let db: duckdb.Database;
let conn: duckdb.Connection;

const SCHEMA = `CREATE TABLE IF NOT EXISTS events (
  id          VARCHAR PRIMARY KEY,
  date        VARCHAR NOT NULL,
  startTime   VARCHAR NOT NULL,
  endTime     VARCHAR NOT NULL,
  title       VARCHAR NOT NULL,
  description VARCHAR,
  meetingLink VARCHAR,
  createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

export const initializeDb = (): Promise<void> =>
  new Promise((resolve, reject) => {
    db = new duckdb.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      console.log('Connected to DuckDB.');
      conn = db.connect();
      conn.run(SCHEMA, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

export const createEvent = (data: CalendarEvent): Promise<string> =>
  new Promise((resolve, reject) => {
    const id = uuidv4();
    conn.run(
      'INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      data.date,
      data.startTime,
      data.endTime,
      data.title,
      data.description ?? null,
      data.meetingLink ?? null,
      new Date(),
      (err) => {
        if (err) return reject(err);
        resolve(id);
      }
    );
  });

export const getEvents = (): Promise<CalendarEventRow[]> =>
  new Promise((resolve, reject) => {
    conn.all(
      'SELECT id, date, startTime, endTime, title, description, meetingLink, createdAt FROM events ORDER BY date, startTime',
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows as CalendarEventRow[]);
      }
    );
  });

export const updateEvent = (id: string, data: CalendarEvent): Promise<number> =>
  new Promise((resolve, reject) => {
    conn.run(
      `UPDATE events SET date=?, startTime=?, endTime=?, title=?, description=?, meetingLink=? WHERE id=?`,
      data.date,
      data.startTime,
      data.endTime,
      data.title,
      data.description ?? null,
      data.meetingLink ?? null,
      id,
      function (this: any, err) {
        if (err) return reject(err);
        resolve(this.changes ?? 0);
      }
    );
  });

export const deleteEvent = (id: string): Promise<number> =>
  new Promise((resolve, reject) => {
    conn.run('DELETE FROM events WHERE id=?', id, function (this: any, err) {
      if (err) return reject(err);
      resolve(this.changes ?? 0);
    });
  });

export const importEvents = async (events: CalendarEvent[]): Promise<{ imported: number }> => {
  let imported = 0;
  for (const event of events) {
    await createEvent(event);
    imported++;
  }
  return { imported };
};

export interface StatsResult {
  totalEvents: number;
  upcomingEvents: number;
  eventsThisWeek: number;
  avgDurationMinutes: number | null;
  hoursThisWeek: number | null;
  eventsByDayOfWeek: { day: string; count: number }[];
  busiestDays: { date: string; count: number }[];
}

function sanitize(row: any): any {
  if (Array.isArray(row)) return row.map(sanitize);
  if (row && typeof row === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'bigint' ? Number(v) : v;
    }
    return out;
  }
  return typeof row === 'bigint' ? Number(row) : row;
}

export const getStats = (): Promise<StatsResult> =>
  new Promise((resolve, reject) => {
    const summaryQuery = `
      SELECT
        COUNT(*) AS totalEvents,
        COUNT(*) FILTER (WHERE date::DATE >= CURRENT_DATE) AS upcomingEvents,
        COUNT(*) FILTER (WHERE
          date::DATE >= date_trunc('week', CURRENT_DATE) AND
          date::DATE < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
        ) AS eventsThisWeek,
        ROUND(AVG(
          (HOUR(endTime::TIME) * 60 + MINUTE(endTime::TIME)) -
          (HOUR(startTime::TIME) * 60 + MINUTE(startTime::TIME))
        ), 1) AS avgDurationMinutes,
        ROUND(SUM(
          (HOUR(endTime::TIME) * 60 + MINUTE(endTime::TIME)) -
          (HOUR(startTime::TIME) * 60 + MINUTE(startTime::TIME))
        ) FILTER (WHERE
          date::DATE >= date_trunc('week', CURRENT_DATE) AND
          date::DATE < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
        ) / 60.0, 1) AS hoursThisWeek
      FROM events
    `;

    const dayQuery = `
      SELECT dayname(date::DATE) AS day, COUNT(*) AS count
      FROM events
      GROUP BY dayname(date::DATE)
      ORDER BY count DESC
    `;

    const busiestQuery = `
      SELECT date, COUNT(*) AS count
      FROM events
      GROUP BY date
      ORDER BY count DESC
      LIMIT 5
    `;

    conn.all(summaryQuery, (err, summaryRows) => {
      if (err) return reject(err);
      conn.all(dayQuery, (err, dayRows) => {
        if (err) return reject(err);
        conn.all(busiestQuery, (err, busiestRows) => {
          if (err) return reject(err);
          resolve({
            ...sanitize(summaryRows[0]),
            eventsByDayOfWeek: sanitize(dayRows),
            busiestDays: sanitize(busiestRows),
          });
        });
      });
    });
  });

process.on('exit', () => db?.close());
