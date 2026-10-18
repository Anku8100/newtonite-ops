# Newtonite Operations Under Pressure

A full-stack operations dashboard for creating, assigning, tracking, and managing operational work items.

## Features

- Create work items with title, description, and priority.
- View and search work items.
- Claim unassigned work items.
- Update work item status.
- View activity logs.
- Delete work items.
- PostgreSQL database integration using Prisma ORM.
- Automated API tests for claim and status validation.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- Database: PostgreSQL
- ORM: Prisma
- Testing: Node.js built-in test runner

## Prerequisites

- Node.js and npm
- PostgreSQL

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Anku8100/newtonite-ops.git
cd newtonite-ops
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file inside `server` with your local PostgreSQL connection details:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/newtonite_ops"
PORT=5000
```

Replace `USERNAME` and `PASSWORD` with your PostgreSQL credentials. Never commit your `.env` file.

### 3. Set up the database

Ensure PostgreSQL is running and the `newtonite_ops` database exists.

If the project's Prisma migrations are present, run:

```bash
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

### 4. Start the backend

From the `server` directory:

```bash
node --experimental-strip-types server.js
```

The API runs at `http://localhost:5000`.

### 5. Start the frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/work-items` | List work items |
| POST | `/api/work-items` | Create a work item |
| PATCH | `/api/work-items/:id/claim` | Claim a work item |
| PATCH | `/api/work-items/:id/status` | Update status |
| GET | `/api/work-items/:id/activity` | View activity log |
| DELETE | `/api/work-items/:id` | Delete a work item |

## Automated Tests

Start the backend first. From the `server` directory, run:

```bash
npm test
```

Current automated tests cover:
- Preventing a work item from being claimed twice.
- Accepting valid statuses and rejecting invalid statuses.

## Known Limitations

- Authentication and role-based authorization are not fully implemented.
- The claim operation currently uses a fixed assignee name.
- Approval-specific workflow permissions need further implementation.
- Additional tests are needed for concurrent requests, authorization, and failure scenarios.

## Repository

https://github.com/katherin915/newtonite-ops
