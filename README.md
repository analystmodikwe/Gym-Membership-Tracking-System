# Gym Membership Tracking System

A full-stack web app for managing gym members, membership plans and payments.
Unpaid members get a **3-day grace period** after their due date, after which
their access is **denied**.

## Features

- Add, delete and track members (name, age, gender, plan, payment status)
- Three membership plans (Basic, Standard, Premium) with different prices and benefits
- Automatic access status: **Active**, **Grace** or **Denied**
- Dashboard: totals, paid vs unpaid, gender and age breakdowns, members per plan, revenue collected vs outstanding

## Tech stack

- **Frontend:** vanilla HTML, CSS and JavaScript (no frameworks)
- **Backend:** Node.js and Express
- **Database:** SQLite (via better-sqlite3)

## Getting started

```bash
cd gym-app
npm install
npm run seed    # optional: loads demo members
npm start
```

Then open http://localhost:3000

## How access status works

| Condition | Status |
|---|---|
| Paid, or not yet due | Active |
| Unpaid, 1 to 3 days past the due date | Grace |
| Unpaid, more than 3 days past the due date | Denied |

Status is **calculated from today's date on every request** and never stored,
so it can't become out of date.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/plans` | List plans and their benefits |
| GET | `/api/members` | List members with plan and access status |
| POST | `/api/members` | Add a member |
| PATCH | `/api/members/:id/pay` | Mark a member as paid |
| DELETE | `/api/members/:id` | Delete a member |
| GET | `/api/stats` | Dashboard statistics |

## Project structure

```
gym-app/
├── server.js     # Express routes
├── db.js         # SQLite setup and plan seeding
├── status.js     # Grace-period business logic
├── seed.js       # Demo data script
└── public/       # Frontend (index.html, style.css, app.js)
```

## Known limitations and next steps

- Payment is a single flag. A production system would keep a payment history
  per month and roll the due date forward after each payment.
- No login or admin roles yet.
- Next: rewrite the backend in TypeScript and add automated tests for the status logic.