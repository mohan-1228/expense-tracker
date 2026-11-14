# Pennyroom

A personal + shared expense tracker. Track personal spending, split costs with a group and settle up, set up recurring expenses, get an AI-generated weekly spending summary, and ask **Penny** (an AI chatbot) questions about your own spending — all grounded in real data, not guesses.

**Live:** https://pennyroom.thapa.dev

For the full architecture, AWS services used, and the reasoning behind each tech choice, see [`TECH_REPORT.md`](./TECH_REPORT.md). For the actual production deployment (resource IDs, redeploy commands), see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Features

- Personal expenses with categories, a monthly calendar heatmap, and category breakdowns
- Group expenses — split evenly, track who owes whom, settle up
- Recurring expenses (rent, subscriptions) that auto-generate on schedule
- Custom categories
- Forgot/reset password via email (Amazon SES)
- AI weekly spending summary (Amazon Bedrock, cached per user per week)
- Penny — an AI chatbot that answers questions about your spending via tool-calling against real database queries

## Tech stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS v4, Recharts
- **Backend:** Node.js, Express 5, PostgreSQL, `node-pg-migrate`
- **AI:** Amazon Bedrock (Claude Haiku 4.5, via the Converse API)
- **Infra:** Docker, deployed on EC2 + RDS + S3 + CloudFront + Route 53

## Local setup

### Prerequisites

- Node.js 20+
- A local PostgreSQL instance
- AWS credentials configured (`aws configure`) if you want the Bedrock features (weekly summary, Penny) or password reset emails to work locally — everything else runs without AWS

### Backend

```
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET at minimum
npm run migrate up
node src/seeds/seedCategories.js
node index.js
```

Runs on `http://localhost:5001` by default (`PORT` in `.env`).

### Frontend

```
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs on `http://localhost:5173`.

### Running both with Docker

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the Docker/Compose setup, including the production deployment path.

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list with explanations. The short version:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string |
| `JWT_SECRET` | backend | Signs auth tokens |
| `CORS_ORIGIN` | backend | Allowed frontend origin(s) |
| `FRONTEND_URL` | backend | Used to build links in password-reset emails |
| `MAIL_FROM` | backend | Sender identity for SES (must be a verified SES identity) |
| `AWS_REGION` | backend | Region for Bedrock/SES calls |
| `VITE_API_URL` | frontend | Backend base URL (build-time, for Vite) |

## Project structure

```
backend/
  src/controllers/   route handlers
  src/routes/        Express route definitions, mounted under /api
  src/services/       Bedrock (summary + Penny chat) and SES (mailer) integrations
  src/middleware/     JWT auth middleware
  src/jobs/           recurring-expense cron job
  migrations/         versioned schema changes (node-pg-migrate)
frontend/
  src/                React components, one per page/feature
```
