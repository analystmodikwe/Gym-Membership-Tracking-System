
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

app.listen(PORT, () => {
  console.log(`Gym app running at http://localhost:${PORT}`);
});