# 📅 TypeScript Koa.js Calendar API

This is a backend API built with **TypeScript**, leveraging the **Koa.js** framework for efficient handling of HTTP requests, and using **DuckDB** for persistent, file-based data storage (OLAP in-process database).

## 🚀 Key Features

- **Stack:** TypeScript, Node.js (ESM), Koa.js, Koa-Router.
- **Database:** **DuckDB** for fast, persistent, file-based storage (`calendar.duckdb`).
- **Identifiers:** All primary keys use **UUIDs (VARCHAR)** for data integrity and distribution.
- **Validation:** Strict input validation using **Zod** for all `POST` and `PUT` requests.
- **Architecture:** Clear separation of concerns between routes, database logic, and types.

---

## 🛠️ Setup and Installation

### Prerequisites

- Node.js (LTS version recommended).
- npm or yarn.

### Installation Steps

1.  **Clone the repository:**

    ```bash
    git clone [your-repo-link]
    cd [your-repo-name]
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run in Development Mode:**
    The project uses `ts-node` as an ESM loader for direct execution of TypeScript files.
    ```bash
    npm run dev
    ```
    The server will be available at `http://localhost:3000`.

> **⚠️ Schema Change Note:** If you modify the database schema (e.g., changing column types), you must **delete the existing `calendar.duckdb` file** before restarting the server (`npm run dev`) to ensure the new `CREATE TABLE` query is executed by DuckDB.

---

## 💡 API Endpoints

All endpoints are prefixed with `/api/v1/calendar`. The ID parameter (`:id`) is expected to be a **UUID string**.

| Method   | Path          | Description                                    | Data Handling                                                       |
| :------- | :------------ | :--------------------------------------------- | :------------------------------------------------------------------ |
| `GET`    | `/events`     | Retrieves all stored calendar events.          | Returns `200 OK` with array of events.                              |
| `POST`   | `/events`     | Creates a new event.                           | **Strictly validated by Zod.** Generates and returns a new UUID.    |
| `PUT`    | `/events/:id` | Updates an existing event identified by `:id`. | **Strictly validated by Zod.** Returns `200 OK` or `404 Not Found`. |
| `DELETE` | `/events/:id` | _(To be implemented)_ Deletes an event.        |                                                                     |

### Request and Validation Details

- **Successful Response (POST/PUT):** `201 Created` or `200 OK` with the new/updated event data.
- **Validation Error (POST/PUT):** If Zod validation fails, the API returns a **`400 Bad Request`** with a generic error message, avoiding exposure of specific schema details to the client.

**Example POST Request Body:**

```json
{
  "title": "Project Review Meeting",
  "date": "2026-01-15",
  "startTime": "14:00",
  "endTime": "15:30",
  "description": "Quarterly review of project milestones.",
  "meetingLink": "[https://teams.link/meeting-id](https://teams.link/meeting-id)"
}
```
