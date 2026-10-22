
// Entry point: starts Express and serves the API plus the frontend.

const express = require("express");
const cors = require("cors");
const db = require("./db");
const { getAccessStatus } = require("./status");

const app = express();
const PORT = 3000;

app.use(cors());           // allow requests from the browser
app.use(express.json());   // parse JSON request bodies
app.use(express.static("public")); // serve the frontend files

// GET /api/plans - returns all plans with benefits as a real array
app.get("/api/plans", (req, res) => {
  const plans = db.prepare("SELECT * FROM plans").all();

  // benefits is stored as a JSON string, so we parse it before sending
  const formatted = plans.map((plan) => ({
    ...plan,
    benefits: JSON.parse(plan.benefits),
  }));

  res.json(formatted);
});

// Helper: turns a raw database row into what the frontend needs
function formatMember(row) {
  return {
    ...row,
    paid: Boolean(row.paid),     // SQLite stores 0/1, convert to true/false
    ...getAccessStatus(row),     // adds status, daysOverdue, graceDaysLeft
  };
}

// GET /api/members - all members with their plan and access status
app.get("/api/members", (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.*, p.name AS plan_name, p.price AS plan_price
       FROM members m
       JOIN plans p ON p.id = m.plan_id
       ORDER BY m.id DESC`
    )
    .all();

  res.json(rows.map(formatMember));
});

// POST /api/members - add a new member
app.post("/api/members", (req, res) => {
  const { name, gender, age, plan_id, paid, due_date } = req.body;

  // Basic validation: never trust data coming from the browser
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!["Male", "Female", "Other"].includes(gender)) {
    return res.status(400).json({ error: "Gender must be Male, Female or Other" });
  }
  if (!Number.isInteger(age) || age < 12 || age > 100) {
    return res.status(400).json({ error: "Age must be a whole number between 12 and 100" });
  }

  // Make sure the chosen plan actually exists
  const plan = db.prepare("SELECT id FROM plans WHERE id = ?").get(plan_id);
  if (!plan) {
    return res.status(400).json({ error: "Plan does not exist" });
  }

  // If no due date is given, default to 30 days from today
  const result = db
    .prepare(
      `INSERT INTO members (name, gender, age, plan_id, paid, due_date)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, date('now', '+30 days')))`
    )
    .run(name.trim(), gender, age, plan_id, paid ? 1 : 0, due_date || null);

  // Fetch the new member back so we return it with plan and status
  const created = db
    .prepare(
      `SELECT m.*, p.name AS plan_name, p.price AS plan_price
       FROM members m JOIN plans p ON p.id = m.plan_id
       WHERE m.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(formatMember(created));
});

// PATCH /api/members/:id/pay - mark a member as paid
app.patch("/api/members/:id/pay", (req, res) => {
  const result = db
    .prepare("UPDATE members SET paid = 1 WHERE id = ?")
    .run(req.params.id);

  // result.changes is how many rows were updated; 0 means the id doesn't exist
  if (result.changes === 0) {
    return res.status(404).json({ error: "Member not found" });
  }
  res.json({ message: "Payment recorded" });
});

// DELETE /api/members/:id - remove a member
app.delete("/api/members/:id", (req, res) => {
  const result = db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Member not found" });
  }
  res.json({ message: "Member deleted" });
});


// GET /api/stats - all the numbers the dashboard needs in one request
app.get("/api/stats", (req, res) => {
  // 1. Total members
  const total = db.prepare("SELECT COUNT(*) AS count FROM members").get().count;

  // 2. Gender breakdown (SQL GROUP BY counts each gender)
  const genderRows = db
    .prepare("SELECT gender, COUNT(*) AS count FROM members GROUP BY gender")
    .all();

  // Start every gender at 0 so the frontend never gets a missing key
  const gender = { Male: 0, Female: 0, Other: 0 };
  genderRows.forEach((row) => (gender[row.gender] = row.count));

  // 3. Age groups: CASE puts each age into a bucket, GROUP BY counts each bucket
  const ageRows = db
    .prepare(
      `SELECT
         CASE
           WHEN age < 18  THEN 'Under 18'
           WHEN age <= 25 THEN '18-25'
           WHEN age <= 35 THEN '26-35'
           WHEN age <= 50 THEN '36-50'
           ELSE '51+'
         END AS age_group,
         COUNT(*) AS count
       FROM members
       GROUP BY age_group`
    )
    .all();

  // Fixed order, with 0 for empty groups
  const ageGroups = { "Under 18": 0, "18-25": 0, "26-35": 0, "36-50": 0, "51+": 0 };
  ageRows.forEach((row) => (ageGroups[row.age_group] = row.count));

  // 4. Members per plan. LEFT JOIN keeps plans that have 0 members
  const plans = db
    .prepare(
      `SELECT p.name, COUNT(m.id) AS members
       FROM plans p
       LEFT JOIN members m ON m.plan_id = p.id
       GROUP BY p.id`
    )
    .all();

  // 5. Revenue: money collected from paid members vs still owed by unpaid ones
  const revenue = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN m.paid = 1 THEN p.price END), 0) AS collected,
         COALESCE(SUM(CASE WHEN m.paid = 0 THEN p.price END), 0) AS outstanding
       FROM members m
       JOIN plans p ON p.id = m.plan_id`
    )
    .get();

  // 6. Paid vs unpaid and access status. Status is computed in JS (not stored),
  // so we fetch the members and run each one through getAccessStatus
  const members = db.prepare("SELECT paid, due_date FROM members").all();

  const access = { Active: 0, Grace: 0, Denied: 0 };
  let paidCount = 0;

  members.forEach((m) => {
    if (m.paid) paidCount++;
    access[getAccessStatus(m).status]++;
  });

  res.json({
    total,
    paid: paidCount,
    unpaid: total - paidCount,
    access,
    gender,
    ageGroups,
    plans,
    revenue,
  });
});

app.listen(PORT, () => {
  console.log(`Gym app running at http://localhost:${PORT}`);
});