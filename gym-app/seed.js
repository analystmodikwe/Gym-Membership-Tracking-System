
// Resets the members table and fills it with demo data.
// Run with: npm run seed

const db = require("./db");

// [name, gender, age, plan_id, paid, due date offset in days from today]
// negative offset = due date in the past (overdue), positive = in the future
const demoMembers = [
  // Paid members (always Active)
  ["Thabo Mokoena",    "Male",   28, 3, 1,  12],
  ["Lerato Dlamini",   "Female", 31, 3, 1,  20],
  ["Sipho Nkosi",      "Male",   45, 2, 1,   8],
  ["Zanele Khumalo",   "Female", 22, 2, 1,  25],
  ["Kabelo Sithole",   "Male",   19, 1, 1,  15],
  ["Naledi Mahlangu",  "Female", 36, 1, 1,   5],
  ["Pieter van Wyk",   "Male",   52, 2, 1,  18],
  ["Aisha Patel",      "Female", 27, 3, 1,  10],

  // Unpaid but not due yet (still Active)
  ["Themba Zulu",      "Male",   33, 2, 0,   4],
  ["Nomsa Ndlovu",     "Female", 24, 1, 0,   9],

  // Unpaid, 1 to 3 days overdue (Grace)
  ["Bongani Mthembu",  "Male",   29, 2, 0,  -1],
  ["Palesa Molefe",    "Female", 21, 1, 0,  -2],
  ["Jabu Cele",        "Other",  26, 3, 0,  -3],

  // Unpaid, more than 3 days overdue (Denied)
  ["Refilwe Tau",      "Female", 38, 2, 0,  -6],
  ["Mandla Buthelezi", "Male",   41, 1, 0, -10],
  ["Karabo Maseko",    "Male",   17, 1, 0,  -5],
];

// Run everything as one transaction: all inserts succeed, or none do
const seed = db.transaction(() => {
  db.prepare("DELETE FROM members").run();
  // Reset the id counter so the first member is id 1 again
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'members'").run();

  // date('now', '+12 days') is SQLite's date maths; the offset is passed as a parameter
  const insert = db.prepare(
    `INSERT INTO members (name, gender, age, plan_id, paid, due_date)
     VALUES (?, ?, ?, ?, ?, date('now', ?))`
  );

  demoMembers.forEach(([name, gender, age, planId, paid, offset]) => {
    // Turns 12 into "+12 days" and -3 into "-3 days"
    const modifier = `${offset >= 0 ? "+" : ""}${offset} days`;
    insert.run(name, gender, age, planId, paid, modifier);
  });
});

seed();
console.log(`Seeded ${demoMembers.length} demo members.`);