const prisma = require('../config/prisma');

/**
 * Generate the next sequential ticket number (e.g. TSK-001, TSK-002, ...).
 *
 * Uses a serialized transaction to prevent duplicate ticket numbers
 * under concurrent requests.
 *
 * @returns {Promise<string>} The next ticket number.
 */
async function generateTicketNumber() {
  return prisma.$transaction(async (tx) => {
    const result = await tx.$queryRaw`
      SELECT "ticketNumber" FROM "Task"
      ORDER BY "createdAt" DESC
      LIMIT 1
      FOR UPDATE
    `;

    if (!result || result.length === 0) return 'TSK-001';

    const lastNum = parseInt(result[0].ticketNumber.split('-')[1], 10);
    const nextNum = (lastNum + 1).toString().padStart(3, '0');
    return `TSK-${nextNum}`;
  }, { isolationLevel: 'Serializable' });
}

module.exports = { generateTicketNumber };
