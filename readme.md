# CalendAPIr

A self-hosted, local-first calendar API. Own your schedule data, query it with SQL, import/export standard calendar files, and build whatever you want on top of it.

Built with TypeScript, Koa.js, and DuckDB.

---

## Why

Most calendar apps are black boxes. You can't query your own data, script against it, or export it in a useful way without jumping through hoops. CalendAPIr gives you a clean REST API backed by an embedded database you fully control — no accounts, no sync, no lock-in.

Because the storage layer is DuckDB (an embedded OLAP database), you can run analytical queries against your schedule that no cloud app will ever let you do: how many hours did you spend in meetings last month, which days are most fragmented, what your average meeting duration is.

---

## Use cases

- **Time audit** — Import your Google Calendar or Outlook export and run SQL queries against your own schedule history.
- **Automation** — Script event creation from cron jobs, config files, or any external trigger via the REST API.
- **Custom frontends** — Build a minimal calendar UI, a CLI planner, or a dashboard on top of a stable local API.
- **Availability checker** — Query your events to find free blocks for scheduling, focus time, or deep work.
- **Self-hosted alternative** — Replace a cloud calendar backend for personal or small-team use without any external dependencies.

---

## Stack

- TypeScript (strict, ESM)
- Node.js + Koa.js + @koa/router
- DuckDB (file-based embedded database)
- Zod (request validation)

---

## Setup

**Prerequisites:** Node.js LTS, npm.

```bash
git clone <repo>
cd CalendAPIr
npm install
```

Copy the environment file and adjust as needed:

```bash
cp .env .env.local
```

```
PORT=3000
DB_PATH=calendar.duckdb
```

Run in development:

```bash
npm run dev
```

Server starts at `http://localhost:3000`.

> **Schema changes:** If you modify the database schema, delete `calendar.duckdb` before restarting so DuckDB recreates the table.

---

## API

All endpoints are prefixed with `/api/v1/calendar`. IDs are UUID strings.

### Events

| Method   | Path                 | Description                          |
| :------- | :------------------- | :----------------------------------- |
| GET      | /events              | List all events, ordered by date     |
| POST     | /events              | Create a new event                   |
| PUT      | /events/:id          | Update an existing event             |
| DELETE   | /events/:id          | Delete an event                      |
| POST     | /events/import       | Import events from an ICS file       |
| GET      | /events/export       | Export all events as an ICS file     |

### Analytics

| Method | Path   | Description                                      |
| :----- | :----- | :----------------------------------------------- |
| GET    | /stats | Aggregated stats: totals, durations, busy days   |

---

### Event schema

| Field         | Type   | Required | Notes                        |
| :------------ | :----- | :------- | :--------------------------- |
| title         | string | yes      | 3-100 characters             |
| date          | string | yes      | YYYY-MM-DD                   |
| startTime     | string | yes      | HH:MM (24h)                  |
| endTime       | string | yes      | HH:MM (24h), must be > start |
| description   | string | no       | Max 500 characters           |
| meetingLink   | string | no       | Must be a valid URL          |

---

### Examples

**Create an event**

```bash
curl -X POST http://localhost:3000/api/v1/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Project Review",
    "date": "2026-06-10",
    "startTime": "14:00",
    "endTime": "15:30",
    "description": "Quarterly milestone review",
    "meetingLink": "https://meet.example.com/abc"
  }'
```

**Import from Google Calendar / Outlook**

Export your calendar as a `.ics` file from your calendar app, then:

```bash
curl -X POST http://localhost:3000/api/v1/calendar/events/import \
  -H "Content-Type: text/calendar" \
  --data-binary @my-calendar.ics
```

**Export to ICS (re-import anywhere)**

```bash
curl http://localhost:3000/api/v1/calendar/events/export -o calendar.ics
```

**Get stats**

```bash
curl http://localhost:3000/api/v1/calendar/stats
```

Returns totals, upcoming count, events this week, average duration, hours scheduled this week, breakdown by day of week, and your five busiest days.

---

## Ideas for future development

- **CalDAV / iCal server** — Expose the data as a CalDAV endpoint so standard clients (Apple Calendar, Thunderbird) can sync directly.
- **Recurring events** — Add RRULE support for weekly standups, habits, and repeating blocks.
- **Timezone support** — Store events with timezone info and handle conversions on read.
- **SQL query endpoint** — Expose a read-only `/query` endpoint that runs arbitrary DuckDB SQL against your events, making it a proper personal analytics tool.
- **Soft deletes** — Add a `deletedAt` column so nothing is truly lost.
- **CLI companion** — A small CLI that wraps common API calls for quick event creation from the terminal.
