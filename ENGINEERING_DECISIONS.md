# Engineering Decisions

## 1. Project Overview

Newtonite Operations Under Pressure is a full-stack web application for managing operational work items. It allows users to create tasks, view tasks, claim unassigned work, update task statuses, view activity logs, and delete tasks.

## 2. Technology Choices

### Frontend: React and Vite

React is used to build the dashboard and manage UI state. Vite provides the frontend development server and build tooling.

### Backend: Node.js and Express

Node.js and Express provide REST API endpoints for creating, retrieving, claiming, updating, and deleting work items.

### Database: PostgreSQL

PostgreSQL stores work items and their activity records in a relational database.

### ORM: Prisma

Prisma provides database access, schema management, and query operations. The PostgreSQL adapter is used to connect the application to the database.

### Testing: Node.js Test Runner

The built-in Node.js test runner is used to automate API tests without adding a separate testing framework.

## 3. Important Implementation Decisions

### Database-backed Work Items

Work items are persisted in PostgreSQL rather than being stored only in frontend state. This allows data to remain available across page refreshes and application restarts.

### Input Validation

The API validates required task titles and accepted priority values before creating work items. The status endpoint also validates the requested status.

### Claiming Work Items

The claim operation uses a conditional database update that only matches work items whose assignee is `Unassigned`. This is intended to prevent multiple requests from successfully claiming the same work item.

The claim operation and activity record are handled within a database transaction.

### Activity Logging

Activity records are created for task creation, claiming, and status changes. These records provide a basic history of important work item actions.

### Error Handling

The API returns appropriate HTTP status codes for successful operations, invalid input, missing resources, conflicting claims, and unexpected server errors.

## 4. Automated Testing

The current automated tests verify:

- A work item can be claimed successfully only once.
- A duplicate claim is rejected.
- Valid status updates are accepted.
- Invalid status values are rejected.

Tests create temporary work items and attempt to clean them up after execution.

## 5. Known Limitations and Future Improvements

- Authentication and role-based authorization are not fully implemented.
- The claim operation currently uses a fixed assignee name.
- Lead-only approval and complete workflow transition rules require further implementation.
- Team-based permissions and seeded user accounts need to be completed.
- Idempotency keys and optimistic concurrency control are not implemented.
- More tests are required for concurrent requests, authorization, and failure scenarios.
- Additional validation, pagination, and production security hardening are needed.

## 6. Security Considerations

Database credentials must be stored in environment variables and must not be committed to the repository. The `.env` file should be excluded through `.gitignore`.

Before production use, the application needs authentication, authorization, stricter request validation, and additional security testing.
