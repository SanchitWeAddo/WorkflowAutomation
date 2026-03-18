/**
 * Task state machine.
 *
 * Defines valid status transitions and which roles are allowed
 * to perform each transition.
 */

const TRANSITIONS = {
  SUBMITTED:     ['ACKNOWLEDGED', 'CANCELLED'],
  ACKNOWLEDGED:  ['ASSIGNED', 'CANCELLED'],
  ASSIGNED:      ['IN_PROGRESS', 'ASSIGNED', 'CANCELLED'],
  IN_PROGRESS:   ['REVIEW', 'ASSIGNED'],
  REVIEW:        ['COMPLETED', 'IN_PROGRESS', 'QA_REVIEW'],
  COMPLETED:     ['CLIENT_REVIEW'],
  QA_REVIEW:     ['QA_FAILED', 'COMPLETED'],
  QA_FAILED:     ['IN_PROGRESS', 'ASSIGNED'],
  CLIENT_REVIEW: ['DELIVERED', 'REOPENED'],
  REOPENED:      ['IN_PROGRESS', 'ASSIGNED'],
  DELIVERED:     [],
  CANCELLED:     [],
};

const ROLE_PERMISSIONS = {
  SYSTEM: ['SUBMITTED→ACKNOWLEDGED'],
  SUPER_ADMIN: Object.values(TRANSITIONS).flatMap((targets, i) => {
    const source = Object.keys(TRANSITIONS)[i];
    return targets.map((t) => `${source}→${t}`);
  }),
  ADMIN: Object.values(TRANSITIONS).flatMap((targets, i) => {
    const source = Object.keys(TRANSITIONS)[i];
    return targets.map((t) => `${source}→${t}`);
  }),
  TEAM_LEAD: [
    'ACKNOWLEDGED→ASSIGNED',
    'REVIEW→COMPLETED',
    'REVIEW→IN_PROGRESS',
    'REVIEW→QA_REVIEW',
    'QA_REVIEW→QA_FAILED',
    'QA_REVIEW→COMPLETED',
    'QA_FAILED→IN_PROGRESS',
    'QA_FAILED→ASSIGNED',
    'COMPLETED→CLIENT_REVIEW',
    'ASSIGNED→ASSIGNED',
    'REOPENED→ASSIGNED',
  ],
  DEVELOPER: [
    'ASSIGNED→IN_PROGRESS',
    'IN_PROGRESS→REVIEW',
    'REOPENED→IN_PROGRESS',
  ],
  CLIENT: [
    'CLIENT_REVIEW→DELIVERED',
    'CLIENT_REVIEW→REOPENED',
  ],
};

/**
 * Validate whether a status transition is allowed for a given role.
 *
 * @param {string} currentStatus - The task's current status.
 * @param {string} newStatus     - The desired new status.
 * @param {string} role          - The role attempting the transition.
 * @returns {true} Returns true if valid.
 * @throws {Error} Throws with statusCode 400 for invalid transitions
 *                 or 403 for unauthorized transitions.
 */
function validateTransition(currentStatus, newStatus, role) {
  const allowed = TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid transition: ${currentStatus} → ${newStatus}`
    );
    err.statusCode = 400;
    throw err;
  }

  const key = `${currentStatus}→${newStatus}`;
  const rolePerms = ROLE_PERMISSIONS[role] || [];

  if (!rolePerms.includes(key)) {
    const err = new Error(
      `Role ${role} cannot perform transition ${key}`
    );
    err.statusCode = 403;
    throw err;
  }

  return true;
}

/**
 * Map a status to the corresponding timestamp field on the Task model.
 */
function getTimestampField(status) {
  const map = {
    ACKNOWLEDGED: 'acknowledgedAt',
    ASSIGNED:     'assignedAt',
    IN_PROGRESS:  'startedAt',
    COMPLETED:    'completedAt',
    DELIVERED:    'deliveredAt',
  };
  return map[status] || null;
}

module.exports = { TRANSITIONS, ROLE_PERMISSIONS, validateTransition, getTimestampField };
