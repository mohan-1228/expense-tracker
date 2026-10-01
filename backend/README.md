# Expense Tracker

A full-stack personal and shared expense-tracking application, built as a portfolio project to demonstrate backend engineering, relational database design, and cloud (AWS) skills for SDE role applications.

---

## Table of Contents

- [Purpose](#purpose)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Project Status](#project-status)
- [Setup / Getting Started](#setup--getting-started)
- [Roadmap](#roadmap)
- [Engineering Notes & Lessons Learned](#engineering-notes--lessons-learned)

---

## Purpose

This project was built to solve two problems at once:

1. **A real personal need** — tracking personal expenses (food, gas, rent, subscriptions, etc.) and splitting shared household costs with a roommate, without relying on a third-party app.
2. **A portfolio gap** — demonstrating hands-on, defensible backend engineering skill (authentication, relational schema design, secure API design, and cloud deployment) for SDE job applications, particularly at Amazon.

The project intentionally mirrors real-world engineering practice rather than tutorial-style development: version-controlled schema migrations, layered architecture, security-conscious API design (ownership checks, parameterized queries), and incremental, tested feature delivery.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js | Team/developer familiarity, strong async I/O model |
| Web framework | Express | Minimal, well-understood routing and middleware model |
| Database | PostgreSQL | Relational data (users, groups, shared expenses) requires real relational integrity, not a document store |
| DB client | `pg` (node-postgres) | Direct, explicit SQL — no ORM abstraction, for full control and learning |
| Migrations | `node-pg-migrate` | Version-controlled, reproducible schema changes across environments |
| Auth | `bcrypt` + `jsonwebtoken` (JWT) | Industry-standard password hashing and stateless authentication |
| Scheduling | `node-cron` | In-process daily job for recurring expense generation (planned migration to AWS Lambda + EventBridge) |
| API testing | Postman | Collection + environment variables, automated token capture |
| Version control | Git + GitHub | Full history, used across multiple development machines |
| Planned frontend | React | Industry standard |
| Planned cloud | AWS (EC2, RDS, S3, IAM, Lambda, CloudFormation) | Target deployment platform, aligned with AWS-focused career goal |
| Planned AI feature | AWS Bedrock (Amazon Nova) | Weekly spending summaries and insights |

---

## Architecture

The backend follows a layered architecture to separate concerns:

```
backend/
├── src/
│   ├── config/         # Database connection pool
│   ├── controllers/    # Business logic (auth, expenses, groups, categories, recurring templates)
│   ├── jobs/            # Scheduled background jobs (recurring expense generation)
│   ├── middleware/      # JWT authentication middleware
│   ├── routes/          # Route definitions, mapped to controllers
│   ├── scripts/         # One-off manual test/trigger scripts
│   └── seeds/            # One-off data seed scripts
├── migrations/          # Version-controlled schema changes
├── index.js             # App entry point, route mounting, cron registration
└── .env                 # Environment-specific secrets (not committed)
```

**Design principles applied:**
- **Routes** define *what endpoints exist*; **controllers** define *what happens*. This separation keeps route files readable as a map of the API surface.
- **No ORM** — raw parameterized SQL is used throughout, both for full transparency into query behavior and to avoid SQL injection risk.
- **Migrations, not manual schema changes** — every table and schema change is a committed, reproducible file, runnable identically on any machine or environment.
- **Auth via middleware** — a single `authMiddleware` function protects any route it's attached to, decoding a JWT and attaching the authenticated user to `req.user` for downstream use.
- **Background jobs run independently of the request/response cycle** — the recurring expense generator lives in `src/jobs/`, not a controller, since it's triggered by a schedule (`node-cron`), not an HTTP request. It's written as a self-contained, transactional function so it can be tested manually via a script or lifted into an AWS Lambda handler later with minimal changes.

---

## Database Schema

Seven core tables:

| Table | Purpose |
|---|---|
| `users` | Account records, hashed passwords |
| `categories` | Expense categories; supports both system defaults (`user_id IS NULL`) and user-created custom categories |
| `groups` | Shared expense groups (e.g., "APT 303") |
| `group_members` | Many-to-many join table (composite primary key on `group_id` + `user_id`) |
| `expenses` | Individual expense records — personal (`group_id IS NULL`) or group-linked; tracks `recurring_template_id` when auto-generated |
| `expense_shares` | Per-person share of a group expense; the basis for balance calculation; `is_settled` tracks settlement |
| `recurring_templates` | Templates for recurring expenses (rent, subscriptions); `next_occurrence` drives the daily generation job |

**Notable design decisions:**
- `categories.user_id` uses `ON DELETE SET NULL` rather than `CASCADE` — a deleted user's custom categories persist rather than disappearing, since they're independent, reusable data.
- `expenses.paid_by` uses `ON DELETE CASCADE` — a financial record with no clear payer is treated as invalid data.
- `group_members` uses a **composite primary key** (`group_id`, `user_id`) rather than a surrogate ID, since the natural uniqueness constraint is "this user is in this group" — this also prevents duplicate membership rows at the database level.
- Money is stored as `NUMERIC(10,2)`, never `FLOAT`, to avoid floating-point rounding errors in financial data.
- `recurring_templates` is deactivated (`is_active = false`), never hard-deleted — expenses already generated from a template retain a valid `recurring_template_id` foreign key, preserving historical records even after a template is removed from future generation.

---

## Features

### Completed

- **Authentication**
  - Signup with bcrypt password hashing (cost factor 10)
  - Login with credential verification and JWT issuance (7-day / 1-hour expiry, environment-dependent)
  - JWT-based auth middleware protecting all non-public routes
  - Generic, non-revealing error messages to prevent user enumeration

- **Personal Expense Management (full CRUD)**
  - Create, read, update, and delete expenses
  - All operations scoped to the authenticated user (`WHERE paid_by = $userId`) to prevent Insecure Direct Object Reference (IDOR) vulnerabilities

- **Groups**
  - Create a group (creator is automatically added as a member)
  - List groups the authenticated user belongs to
  - Add members to a group by email, with membership-based authorization (only existing members can add new ones)

- **Group Expense Splitting**
  - Logging a group expense automatically creates one `expense_shares` row per group member, splitting the total evenly
  - Correct handling of rounding remainders (e.g., $100 split 3 ways: two people pay $33.33, the payer absorbs the extra $0.01 so the total reconciles exactly)
  - The payer's own share is automatically marked settled

- **Expense Settlement**
  - `PATCH /expenses/shares/:shareId/settle` — marks an individual expense share as settled

- **Balance Calculation**
  - `GET /groups/:groupId/balance` calculates *net* balances between group members
  - Mutual debts are algorithmically netted (e.g., if A owes B $45 and B owes A $45, the result is reported as settled, not as two open debts)

- **Categories**
  - `GET /categories` — returns system default categories plus the authenticated user's custom categories
  - Default category seeding — a starter set of categories (Food, Gas, Rent, Groceries, Insurance, etc.) available to every user

- **Recurring Expenses**
  - Full CRUD for recurring templates: create, list, update, and soft-delete (deactivate rather than hard-delete, to preserve historical expense records tied to a template)
  - A daily scheduled job (`node-cron`) checks for due templates, generates the corresponding `expenses` row, and advances the template to its next occurrence
  - Idempotent by design — wrapped in a database transaction with row-level locking (`FOR UPDATE`) and a duplicate-generation guard, so the job is safe to run concurrently or more than once for the same cycle

- **Developer tooling**
  - Postman collection with environment variables and an automated login script that captures the JWT into a reusable variable
  - Full local dev environment reproducibility across multiple machines via Git + migrations (tested in practice, including a full machine loss/recovery)

### In Progress / Not Yet Built

- Frontend (React) — the entire API has been built and tested at the HTTP level (Postman); no UI exists yet
- AWS deployment (see Roadmap)
- AI-generated weekly spending summaries (AWS Bedrock)

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Create a new user account |
| POST | `/auth/login` | No | Authenticate and receive a JWT |
| GET | `/db-test` | No | Health check — confirms DB connectivity |
| POST | `/expenses` | Yes | Create a personal expense |
| GET | `/expenses` | Yes | List the authenticated user's expenses |
| PUT | `/expenses/:id` | Yes | Update an owned expense |
| DELETE | `/expenses/:id` | Yes | Delete an owned expense |
| PATCH | `/expenses/shares/:shareId/settle` | Yes | Mark an individual expense share as settled |
| GET | `/categories` | Yes | List system default and user-created categories |
| POST | `/groups` | Yes | Create a group (creator auto-joins) |
| GET | `/groups` | Yes | List groups the user belongs to |
| POST | `/groups/:groupId/members` | Yes | Add a member to a group by email |
| POST | `/groups/:groupId/expenses` | Yes | Log a group expense; auto-splits among members |
| GET | `/groups/:groupId/balance` | Yes | Net balance summary for the group |
| POST | `/recurring-templates` | Yes | Create a recurring expense template |
| GET | `/recurring-templates` | Yes | List the authenticated user's recurring templates |
| PUT | `/recurring-templates/:id` | Yes | Update a recurring template |
| POST | `/recurring-templates/:id/deactivate` | Yes | Soft-delete a template (sets `is_active = false`) |

All protected routes require an `Authorization: Bearer <token>` header.

---

## Project Status

**Current phase:** Backend feature-complete and manually tested end-to-end via Postman, including the automated recurring expense job. No frontend or cloud deployment yet.

**Last verified working (local dev):**
- Full auth flow (signup → login → protected route access)
- Full expense CRUD lifecycle
- Individual expense share settlement
- Group creation, membership, and expense splitting
- Balance netting, verified against manually-calculated expected results
- Category listing (system defaults + user-created)
- Recurring expense template CRUD, and automated daily generation verified via manual test script (idempotency confirmed by running the job twice in a row with no duplicate expense created)

---

## Setup / Getting Started

### Prerequisites
- Node.js
- PostgreSQL (via Homebrew on macOS)
- Git

### Installation

```bash
git clone https://github.com/mohan-1228/expense-tracker.git
cd expense-tracker/backend
npm install
```

### Environment Configuration

Create a `.env` file in `backend/` (not committed to version control):

```
PORT=5001
DATABASE_URL=postgresql://<your-username>@localhost:5432/expense_tracker_dev
JWT_SECRET=<a long, randomly generated string>
```

Generate a secure `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Database Setup

```bash
createdb expense_tracker_dev
export DATABASE_URL=postgresql://<your-username>@localhost:5432/expense_tracker_dev
npx node-pg-migrate up
node src/seeds/seedCategories.js
```

### Running the Server

```bash
node index.js
```

The API will be available at `http://localhost:5001`. A daily cron job (6:00 AM server time) automatically generates due recurring expenses while the server is running.

---

## Roadmap

**Backend completion**
- [x] Settle-up endpoint for individual expense shares
- [x] Recurring expense generation (scheduled job)
- [x] Categories endpoint (`GET /categories`) for frontend consumption

**AWS Deployment** (deliberate, staged order — infrastructure understood manually before being codified)
1. Deploy to EC2 + RDS inside a VPC (RDS in a private subnet, reachable only from EC2)
2. Add receipt image uploads to S3 (store the S3 object key in Postgres, not the file itself)
3. Configure IAM with least-privilege roles — no root credentials, each service scoped to only what it needs
4. Add a Lambda function triggered by S3 uploads to process new receipts
5. Migrate recurring expense generation from in-process `node-cron` to a scheduled AWS Lambda (EventBridge trigger), once RDS is live and reachable from Lambda's VPC attachment — the generation logic itself requires no changes, only the trigger mechanism
6. Codify the above as a CloudFormation template, once the manual setup is understood end-to-end

**Frontend**
- [ ] React application consuming the existing API
- [ ] Expense entry, category selection, group views, balance display

**AI Feature**
- [ ] Weekly spending summary generation via AWS Bedrock (Amazon Nova Micro/Lite), using pre-aggregated spending deltas rather than raw transaction data, to keep token usage and cost minimal

---

## Engineering Notes & Lessons Learned

A few real issues encountered and resolved during development, kept here as documentation of actual debugging experience rather than idealized process:

- **Migration ordering matters.** A migration referencing a foreign key to a table that doesn't exist yet fails outright. Migrations run in filename-timestamp order, so dependent tables must be created with later timestamps than what they reference.
- **`dotenv` must be loaded before anything that reads `process.env`.** A standalone script that imported the database config before calling `dotenv.config()` connected with incorrect (fallback) credentials — a subtle, non-obvious failure mode.
- **IDOR prevention is a query-level concern, not an afterthought.** Every update/delete/read operation on user-owned data includes an ownership check directly in the `WHERE` clause (e.g., `WHERE id = $1 AND paid_by = $2`), rather than checking ownership separately from the mutation.
- **Money must be stored as `NUMERIC`, never `FLOAT`**, and values returned from `pg` for numeric columns arrive as strings in JavaScript — requiring explicit `parseFloat()` before arithmetic.
- **Multi-machine development requires discipline.** Environment files (`.env`) and `node_modules` are intentionally excluded from Git and must be recreated per machine; uncommitted work is at real risk during environment transitions (learned firsthand after a hardware failure mid-session).
- **Background jobs need their own safety net.** A scheduled job has no caller to retry it or notice a silent failure, so the recurring expense generator wraps its work in a transaction with row-level locking and a duplicate-generation guard — correctness here can't rely on "just don't call it twice," because nothing enforces that in a cron context the way it would in a single API request.
- **Forgetting a module import fails loudly, not silently.** New controller files repeatedly hit `ReferenceError: pool is not defined` or `authMiddleware is not defined` when a new file skipped a `require` line present in sibling files — a reminder to copy the import block first, logic second, when scaffolding a new controller/route pair.

---

*This README reflects the project as of October 2026 and will be updated as development continues.*
