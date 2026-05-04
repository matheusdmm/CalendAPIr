import Router from '@koa/router';
import {
  createEvent,
  deleteEvent,
  getEvents,
  getStats,
  importEvents,
  updateEvent,
} from '../db/database.js';
import { CalendarEventSchema } from '../types/validationSchema.js';
import { generateICS, parseICS } from '../utils/ics.js';

const router = new Router({ prefix: '/api/v1/calendar' });

router.get('/events', async (ctx) => {
  try {
    const events = await getEvents();
    ctx.status = 200;
    ctx.body = { count: events.length, data: events };
  } catch (error) {
    console.error('Error fetching events:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal error retrieving events.' };
  }
});

router.post('/events/import', async (ctx) => {
  try {
    const body = ctx.request.body;
    if (typeof body !== 'string' || !body.includes('BEGIN:VCALENDAR')) {
      ctx.status = 400;
      ctx.body = { error: 'Body must be a valid ICS file with Content-Type: text/calendar.' };
      return;
    }
    const parsed = parseICS(body);
    if (parsed.length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'No valid events found in ICS file.' };
      return;
    }
    const result = await importEvents(parsed);
    ctx.status = 200;
    ctx.body = { message: `Imported ${result.imported} events.`, ...result };
  } catch (error) {
    console.error('Error importing ICS:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal error importing events.' };
  }
});

router.get('/events/export', async (ctx) => {
  try {
    const events = await getEvents();
    ctx.status = 200;
    ctx.set('Content-Type', 'text/calendar; charset=utf-8');
    ctx.set('Content-Disposition', 'attachment; filename="calendar.ics"');
    ctx.body = generateICS(events);
  } catch (error) {
    console.error('Error exporting ICS:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal error exporting events.' };
  }
});

router.post('/events', async (ctx) => {
  try {
    const result = CalendarEventSchema.safeParse(ctx.request.body);
    if (!result.success) {
      ctx.status = 400;
      ctx.body = { error: 'Validation failed.', issues: result.error.issues };
      return;
    }
    const data = result.data;
    if (data.startTime >= data.endTime) {
      ctx.status = 400;
      ctx.body = { error: 'End time must be greater than start time.' };
      return;
    }
    const id = await createEvent(data);
    ctx.status = 201;
    ctx.body = { message: 'Event created.', id, data };
  } catch (error) {
    console.error('Error creating event:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal error.' };
  }
});

router.put('/events/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const result = CalendarEventSchema.safeParse(ctx.request.body);
    if (!result.success) {
      ctx.status = 400;
      ctx.body = { error: 'Validation failed.', issues: result.error.issues };
      return;
    }
    const data = result.data;
    if (data.startTime >= data.endTime) {
      ctx.status = 400;
      ctx.body = { error: 'End time must be greater than start time.' };
      return;
    }
    const changes = await updateEvent(id, data);
    if (changes === 0) {
      ctx.status = 404;
      ctx.body = { error: 'Event not found.' };
      return;
    }
    ctx.status = 200;
    ctx.body = { message: 'Event updated.', id, data };
  } catch (error) {
    console.error('Error updating event:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal error.' };
  }
});

router.delete('/events/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const changes = await deleteEvent(id);
    if (changes === 0) {
      ctx.status = 404;
      ctx.body = { error: 'Event not found.' };
      return;
    }
    ctx.status = 200;
    ctx.body = { message: 'Event deleted.' };
  } catch (error) {
    console.error('Error deleting event:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal error.' };
  }
});

router.get('/stats', async (ctx) => {
  try {
    const stats = await getStats();
    ctx.status = 200;
    ctx.body = stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal error fetching stats.' };
  }
});

export default router;
