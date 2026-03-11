/**
 * SLA (Service Level Agreement) deadline utilities.
 */

const SLA_DEFAULTS = {
  urgent_hours: 24,
  high_hours: 48,
  normal_hours: 96,
  low_hours: 168,
};

/**
 * Calculate the SLA deadline DateTime for a given priority and SLA config.
 *
 * @param {string}  priority   - One of URGENT, HIGH, NORMAL, LOW.
 * @param {object}  slaConfig  - Project-specific SLA config JSON (overrides defaults).
 * @param {Date}   [createdAt] - The task creation time (defaults to now).
 * @returns {Date} The calculated SLA deadline.
 */
function calculateSLADeadline(priority, slaConfig, createdAt = new Date()) {
  const config = { ...SLA_DEFAULTS, ...(typeof slaConfig === 'object' ? slaConfig : {}) };

  const hoursMap = {
    URGENT: config.urgent_hours,
    HIGH:   config.high_hours,
    NORMAL: config.normal_hours,
    LOW:    config.low_hours,
  };

  const hours = hoursMap[priority] || config.normal_hours;
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

/**
 * Determine the current SLA status relative to the deadline.
 *
 * @param {Date|string|null} slaDeadline - The SLA deadline.
 * @returns {{ status: string, hoursRemaining: number|null }}
 */
function getSLAStatus(slaDeadline) {
  if (!slaDeadline) return { status: 'none', hoursRemaining: null };

  const now = new Date();
  const deadline = new Date(slaDeadline);
  const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return { status: 'breached', hoursRemaining: Math.round(hoursRemaining) };
  }
  if (hoursRemaining <= 12) {
    return { status: 'warning', hoursRemaining: Math.round(hoursRemaining) };
  }
  return { status: 'on_track', hoursRemaining: Math.round(hoursRemaining) };
}

module.exports = { calculateSLADeadline, getSLAStatus };
