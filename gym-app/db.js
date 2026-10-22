
// Creates the SQLite database, the tables, and seeds the plans.

const Database = require("better-sqlite3");

// Creates gym.db in the project folder if it doesn't exist yet
const db = new Database("gym.db");

// Plans table: each package has a price and a list of benefits
db.exec(`
  CREATE TABLE IF NOT EXISTS plans (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL UNIQUE,
    price    INTEGER NOT NULL,   -- monthly price in Rands
    benefits TEXT NOT NULL       -- stored as a JSON string
  );

  CREATE TABLE IF NOT EXISTS members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    gender     TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    age        INTEGER NOT NULL CHECK (age >= 12),
    plan_id    INTEGER NOT NULL,
    paid       INTEGER NOT NULL DEFAULT 0,  -- 0 = not paid, 1 = paid (SQLite has no boolean)
    due_date   TEXT NOT NULL,               -- payment due date, format YYYY-MM-DD
    created_at TEXT NOT NULL DEFAULT (date('now')),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
  );
`);

// Seed the plans only if the table is empty, so restarting doesn't duplicate them
const planCount = db.prepare("SELECT COUNT(*) AS count FROM plans").get().count;

if (planCount === 0) {
  const insertPlan = db.prepare(
    "INSERT INTO plans (name, price, benefits) VALUES (?, ?, ?)"
  );

  insertPlan.run("Basic", 299, JSON.stringify([
    "Gym floor access (6am - 8pm)",
    "Locker room access",
  ]));

  insertPlan.run("Standard", 499, JSON.stringify([
    "24/7 gym access",
    "Group classes",
    "Locker room access",
  ]));

  insertPlan.run("Premium", 799, JSON.stringify([
    "24/7 gym access",
    "Group classes",
    "2 personal training sessions per month",
    "Sauna and towel service",
    "Bring a guest twice a month",
  ]));
}

module.exports = db;