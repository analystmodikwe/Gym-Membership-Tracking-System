// Decides whether a member can access the gym, based on payment and due date.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 3; // days allowed after the due date before access is denied
