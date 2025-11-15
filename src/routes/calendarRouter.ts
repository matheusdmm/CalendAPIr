import Router from '@koa/router';
import { createEvent, getEvents } from '../db/database.js';
import {
  CalendarEventSchema,
  CalendarEvent,
} from '../types/validationSchema.js';
import { z } from 'zod';
import { ParameterizedContext } from 'koa';

const router = new Router({ prefix: '/api/v1/calendar' });

/**
 * GET /api/v1/calendar/events
 */
router.get('/events', async (ctx: ParameterizedContext) => {
  try {
    const events: CalendarEvent[] = await getEvents();

    ctx.status = 200;
    ctx.body = {
      count: events.length,
      data: events,
    };
  } catch (error) {
    console.error('Error searching events ad duckDB:', error);
    ctx.status = 500;
    ctx.body = {
      error: 'Internal error retrieving events.',
    };
  }
});

/**
 * POST /api/v1/calendar/events
 */
router.post('/events', async (ctx: ParameterizedContext) => {
  try {
    const validatedData: CalendarEvent = CalendarEventSchema.parse(
      ctx.request.body
    );

    if (validatedData.startTime >= validatedData.endTime) {
      ctx.status = 400;
      ctx.body = {
        error: 'Violated event rule.',
        details: 'End time must be greater than start time.',
      };
      return;
    }

    const newId = await createEvent(validatedData);

    ctx.status = 201;
    ctx.body = {
      message: 'Event successfully created',
      id: newId,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      ctx.status = 400;
      ctx.body = {
        error: 'Error validating data',
      };
    } else {
      console.error('Internal error creating event:', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal error.' };
    }
  }
});

export default router;
