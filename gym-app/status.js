
// Decides whether a member can access the gym, based on payment and due date.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 3; // days allowed after the due date before access is denied

function getAccessStatus(member) {
  // Paid members always have access
  if (member.paid) {
    return { status: "Active", daysOverdue: 0, graceDaysLeft: null };
  }

  // Today's date as YYYY-MM-DD, compared against the due date at midnight (UTC)
  // so the time of day never affects the result
  const todayStr = new Date().toISOString().slice(0, 10);
  const daysOverdue = Math.floor(
    (new Date(todayStr) - new Date(member.due_date)) / MS_PER_DAY
  );

  // Not due yet: still fine
  if (daysOverdue <= 0) {
    return { status: "Active", daysOverdue: 0, graceDaysLeft: null };
  }

  // 1 to 3 days overdue: grace period
  if (daysOverdue <= GRACE_DAYS) {
    return {
      status: "Grace",
      daysOverdue,
      graceDaysLeft: GRACE_DAYS - daysOverdue,
    };
  }

  // More than 3 days overdue: access denied
  return { status: "Denied", daysOverdue, graceDaysLeft: 0 };
}

module.exports = { getAccessStatus, GRACE_DAYS };