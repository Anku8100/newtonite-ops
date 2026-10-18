# Newtonite — Operations Under Pressure

A full-stack operational work management dashboard built for the Newtonite Software Engineering Challenge. The application allows users to create, view, assign, track, and manage operational work items through a web-based dashboard.

## 🚀 Live Demo

- **Application:** https://newtonite-ops-xi.vercel.app/
- **GitHub Repository:** https://github.com/Anku8100/newtonite-ops

## ✨ Features

- **Work Item Management:** Create, view, update, and delete operational work items.
- **Priority Management:** Set priorities such as Urgent, High, Medium, and Low.
- **Task Claiming:** Claim an unassigned work item.
- **Status Tracking:** Update work item statuses.
- **Search and Filtering:** Find work items using the available dashboard controls.
- **Activity History:** Record actions such as task creation, claiming, and status changes.
- **Persistent Storage:** Store work items and activity records in PostgreSQL.
- **REST API:** Backend endpoints built with Express.js.
- **Responsive Dashboard:** A React-based interface for managing work items.

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL

### Testing
- Node.js built-in test runner
- Integration tests for task claiming and status validation

## 📁 Project Structure

```text
newtonite-ops/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── package-lock.json
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── routes/
│   │   └── workItems.js
│   ├── tests/
│   │   └── workItems.test.js
│   ├── db.js
│   ├── server.js
│   ├── prisma7.config.ts
│   ├── package.json
│   └── package-lock.json
├── .gitignore
├── README.md
└── ENGINEERING_DECISIONS.md
```

## ⚙️ Prerequisites

Install the following before running the application locally:

- Node.js and npm
- PostgreSQL
- Git

## 🔧 Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Anku8100/newtonite-ops.git
cd newtonite-ops
```

### 2. Configure the backend

Open a terminal in the project root and run:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory and add your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/newtonite_ops"
```

Replace `USER` and `PASSWORD` with your local PostgreSQL credentials. Never commit your actual `.env` file.

### 3. Set up the database

Make sure PostgreSQL is running and the `newtonite_ops` database exists.

Generate the Prisma client:

```bash
npx prisma generate --config prisma7.config.ts
```

Apply the existing migrations:

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

### 4. Start the backend

From the `server` directory, run:

```bash
node --experimental-strip-types server.js
```

The backend is expected to run at:

`http://localhost:5000`

You can check the health endpoint at:

`http://localhost:5000/`

### 5. Start the frontend

Open a second terminal in the project root:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## 🔌 API Endpoints

The backend exposes the following work-item endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/work-items` | List work items |
| POST | `/api/work-items` | Create a work item |
| PATCH | `/api/work-items/:id/claim` | Claim a work item |
| PATCH | `/api/work-items/:id/status` | Update work-item status |
| GET | `/api/work-items/:id/activity` | View activity history |
| DELETE | `/api/work-items/:id` | Delete a work item |

The API runs on the backend server, which is configured for port `5000` by default.

## 🧪 Running Tests

Start the backend and ensure the database is configured before running the integration tests.

From the `server` directory, execute:

```bash
npm test
```

The current tests cover:

- Successful work-item creation and claiming.
- Rejection of a second claim with a conflict response.
- Acceptance of valid status updates.
- Rejection of invalid status values.

The integration tests use the running backend at `http://localhost:5000/api/work-items`.

## 🔐 Security and Configuration

- Store database credentials in environment variables.
- Do not commit `.env` files, passwords, API keys, or other secrets.
- Configure environment variables separately for local development and deployment.
- Validate API requests on the server.
- Use a database account appropriate for the environment.

## ⚠️ Known Limitations

This is a limited-scope challenge implementation and is not yet a complete production-ready operations platform.

- Authentication and role-based authorization are not fully implemented.
- Team membership and team-scoped permissions are not fully implemented.
- Lead-only approval enforcement is not fully implemented.
- Optimistic locking and stale-version conflict handling are not fully implemented.
- Idempotency-key handling is not implemented.
- Advanced server-side filtering and pagination may require further development.
- Automated tests currently cover selected work-item behaviours rather than every critical scenario.
- Background job processing and notification delivery are not implemented.
- Demo login credentials are not provided because a complete authentication flow has not been implemented.

## 🧠 Engineering Decisions

The project uses React for the frontend, Express.js for the backend API, PostgreSQL for persistent storage, and Prisma ORM for database access.

Work-item activity is stored separately from the main work-item record to maintain a basic history of important actions.

Task claiming uses a conditional database update so that an already-claimed item cannot be claimed again through the same operation.

See [`ENGINEERING_DECISIONS.md`](./ENGINEERING_DECISIONS.md) for further implementation decisions, trade-offs, and limitations.

## 🔮 Future Improvements

- Implement authentication and role-based access control.
- Add team management and team-scoped permissions.
- Enforce allowed workflow transitions and Lead approval.
- Add optimistic locking and stale-version conflict handling.
- Implement idempotency keys for retry-safe requests.
- Add cursor-based pagination and advanced filtering.
- Expand automated test coverage for concurrency, authorization, and workflow rules.
- Introduce background jobs and notification delivery.
- Improve deployment configuration, monitoring, and error handling.

## 👩‍💻 Author

**Anku Kumari**

- GitHub: [@Anku8100](https://github.com/Anku8100)
- Repository: [newtonite-ops](https://github.com/Anku8100/newtonite-ops)

---

Built for the Newtonite Software Engineering Challenge — **Operations Under Pressure**.
