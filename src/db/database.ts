import duckdb from 'duckdb';
import { v4 as uuidv4 } from 'uuid';
import { CalendarEvent } from '../types/calendar.js';

const DB_PATH = 'calendar.duckdb';
let db: duckdb.Database;
let conn: duckdb.Connection;

const query = `CREATE TABLE IF NOT EXISTS events (
    id VARCHAR PRIMARY KEY, 
    date VARCHAR NOT NULL,
    startTime VARCHAR NOT NULL,
    endTime VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description VARCHAR,
    meetingLink VARCHAR,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

export const initializeDb = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db = new duckdb.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erro ao conectar ao DuckDB:', err.message);
        return reject(err);
      }
      console.log('Conectado ao DuckDB.');
      conn = db.connect();

      conn.run(query, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

export const createEvent = (eventData: CalendarEvent): Promise<string> => {
  return new Promise((resolve, reject) => {
    const newId = uuidv4();

    const { date, startTime, endTime, title, description, meetingLink } =
      eventData;

    conn.run(
      `INSERT INTO events 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      newId,
      date,
      startTime,
      endTime,
      title,
      description || null,
      meetingLink || null,
      new Date(),
      (err) => {
        if (err) return reject(err);
        resolve(newId);
      }
    );
  });
};

export const getEvents = (): Promise<CalendarEvent[]> => {
  return new Promise((resolve, reject) => {
    conn.all(
      'SELECT id, date, startTime, endTime, title, description, meetingLink, createdAt FROM events ORDER BY date, startTime',
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows as CalendarEvent[]);
      }
    );
  });
};

export const updateEvent = (
  id: string,
  eventData: CalendarEvent
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { date, startTime, endTime, title, description, meetingLink } =
      eventData;

    const sql = `
            UPDATE events SET 
            date = ?, 
            startTime = ?, 
            endTime = ?, 
            title = ?, 
            description = ?, 
            meetingLink = ?
            WHERE id = ?
        `;

    conn.run(
      sql,
      date,
      startTime,
      endTime,
      title,
      description || null,
      meetingLink || null,
      id,
      function (this: any, err) {
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });
};

process.on('exit', () => db?.close());
