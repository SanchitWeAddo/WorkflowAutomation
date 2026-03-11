const prisma = require('../config/prisma');

/**
 * Generate the next sequential ticket number (e.g. TSK-001, TSK-002, ...).
 *
 * Queries the database for the most recently created task's ticket number
 * and increments the numeric portion.  If no tasks exist yet, starts at TSK-001.
 *
 * @returns {Promise<string>} The next ticket number.
 */
async function generateTicketNumber() {
  const lastTask = await prisma.task.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { ticketNumber: true },
  });

  if (!lastTask) return 'TSK-001';

  const lastNum = parseInt(lastTask.ticketNumber.split('-')[1], 10);
  const nextNum = (lastNum + 1).toString().padStart(3, '0');
  return `TSK-${nextNum}`;
}

module.exports = { generateTicketNumber };
