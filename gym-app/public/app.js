
// Talks to the Express API and draws the members table.

const API = "/api"; // same server serves the page and the API, so a relative path works

// Grab the elements we need once, at the top
const form = document.getElementById("member-form");
const planSelect = document.getElementById("plan");
const tableBody = document.getElementById("members-body");
const message = document.getElementById("message");


// Loads the numbers from /api/stats and redraws the whole dashboard
async function loadStats() {
  const res = await fetch(`${API}/stats`);
  const stats = await res.json();

  renderStatCards(stats);
  renderBars("gender-bars", stats.gender, stats.total);
  renderBars("age-bars", stats.ageGroups, stats.total);

  // The API sends plans as an array; renderBars wants { name: count }
  const perPlan = {};
  stats.plans.forEach((p) => (perPlan[p.name] = p.members));
  renderBars("plan-bars", perPlan, stats.total);
}

// Builds the row of number cards at the top of the page
function renderStatCards(stats) {
  const container = document.getElementById("stat-cards");
  container.innerHTML = ""; // clear old cards (safe: no user data inserted here)

  // [label, value, extra CSS class]
  const cards = [
    ["Total members", stats.total, ""],
    ["Paid", stats.paid, ""],
    ["Unpaid", stats.unpaid, ""],
    ["Active", stats.access.Active, ""],
    ["In grace period", stats.access.Grace, "warn"],
    ["Access denied", stats.access.Denied, "bad"],
    ["Collected", `R${stats.revenue.collected}`, ""],
    ["Outstanding", `R${stats.revenue.outstanding}`, ""],
  ];

  cards.forEach(([label, value, kind]) => {
    const card = document.createElement("div");
    card.className = `stat ${kind}`;

    const number = document.createElement("span");
    number.className = "stat-number";
    number.textContent = value;

    const text = document.createElement("span");
    text.className = "stat-label";
    text.textContent = label;

    card.append(number, text);
    container.appendChild(card);
  });
}

// One reusable function that draws a set of horizontal bars.
// data = { label: count, ... }, total = used to work out each bar's width
function renderBars(containerId, data, total) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  Object.entries(data).forEach(([label, count]) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const text = document.createElement("div");
    text.textContent = `${label}: ${count}`;

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    // Width is the share of all members; guard against dividing by 0
    fill.style.width = total ? `${(count / total) * 100}%` : "0%";

    track.appendChild(fill);
    row.append(text, track);
    container.appendChild(row);
  });
}

// Draws one card per plan, with its price and benefits list
function renderPlanCards(plans) {
  const container = document.getElementById("plan-cards");
  container.innerHTML = "";

  plans.forEach((plan) => {
    const card = document.createElement("div");
    card.className = "plan";

    const name = document.createElement("h3");
    name.textContent = plan.name;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = `R${plan.price}/month`;

    const list = document.createElement("ul");
    plan.benefits.forEach((benefit) => {
      const li = document.createElement("li");
      li.textContent = benefit;
      list.appendChild(li);
    });

    card.append(name, price, list);
    container.appendChild(card);
  });
}

// One function that refreshes everything that depends on member data
function refresh() {
  loadMembers();
  loadStats();
}


// Loads plans from the API and fills the plan dropdown
async function loadPlans() {
  const res = await fetch(`${API}/plans`);
  const plans = await res.json();

  plans.forEach((plan) => {
    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = `${plan.name} - R${plan.price}/month`;
    planSelect.appendChild(option);
  });
    renderPlanCards(plans); // also show the plans section
}

// Loads members from the API and redraws the table
async function loadMembers() {
  const res = await fetch(`${API}/members`);
  const members = await res.json();
  renderMembers(members);
}

// Small helper: creates a <td> with text and adds it to a row.
// textContent (not innerHTML) means a name like "<script>..." is shown as plain
// text and never runs as code, which prevents XSS.
function addCell(row, text) {
  const td = document.createElement("td");
  td.textContent = text;
  row.appendChild(td);
  return td;
}

// Small helper: creates a button with a click handler
function makeButton(label, className, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = className;
  btn.addEventListener("click", onClick);
  return btn;
}

// Builds one table row per member
function renderMembers(members) {
  tableBody.innerHTML = ""; // clear old rows (safe: we insert no user data here)

  if (members.length === 0) {
    const row = document.createElement("tr");
    const td = addCell(row, "No members yet. Add one above.");
    td.colSpan = 8;
    tableBody.appendChild(row);
    return;
  }

  members.forEach((m) => {
    const row = document.createElement("tr");

    addCell(row, m.name);
    addCell(row, m.age);
    addCell(row, m.gender);
    addCell(row, m.plan_name);
    addCell(row, m.paid ? "Yes" : "No");
    addCell(row, m.due_date);

    // Access cell: a coloured badge (class is active / grace / denied)
    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${m.status.toLowerCase()}`;
    const days = m.graceDaysLeft;
    badge.textContent =
      m.status === "Grace"
        ? `Grace (${days} ${days === 1 ? "day" : "days"} left)`
        : m.status;
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    // Actions cell: "Mark paid" only shows for unpaid members
    const actionsCell = document.createElement("td");
    if (!m.paid) {
      actionsCell.appendChild(
        makeButton("Mark paid", "small", () => markPaid(m.id))
      );
    }
    actionsCell.appendChild(
      makeButton("Delete", "small danger", () => deleteMember(m.id, m.name))
    );
    row.appendChild(actionsCell);

    tableBody.appendChild(row);
  });
}

// Tells the server a member has paid, then refreshes the table
async function markPaid(id) {
  await fetch(`${API}/members/${id}/pay`, { method: "PATCH" });
  refresh(); // was loadMembers()
}

// Asks for confirmation, deletes the member, then refreshes the table
async function deleteMember(id, name) {
  if (!confirm(`Delete ${name}?`)) return;
  await fetch(`${API}/members/${id}`, { method: "DELETE" });
  refresh(); // was loadMembers()
}

// Runs when the form is submitted
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser's default page reload
  message.textContent = "";

  // Build the body the API expects. Numbers must be real numbers, not strings
  const body = {
    name: document.getElementById("name").value,
    age: Number(document.getElementById("age").value),
    gender: document.getElementById("gender").value,
    plan_id: Number(planSelect.value),
    paid: document.getElementById("paid").checked,
  };

  // Only send a due date if the user picked one (otherwise the server defaults it)
  const dueDate = document.getElementById("due-date").value;
  if (dueDate) body.due_date = dueDate;

  try {
    const res = await fetch(`${API}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    // The server sends { error: "..." } with a 400 status when validation fails
    if (!res.ok) {
      message.textContent = data.error;
      return;
    }

    form.reset();
    refresh();
  } catch (err) {
    message.textContent = "Could not reach the server. Is it running?";
  }
});

// Runs once when the page opens
loadPlans();
refresh(); // loads the members table AND the dashboard