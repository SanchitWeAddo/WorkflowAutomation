const prisma = require('../config/prisma');
const logger = require('../utils/logger');

/**
 * List users for an organization with pagination and filters.
 *
 * @param {string} orgId
 * @param {{ role?: string, isActive?: boolean, search?: string, page?: number, limit?: number }} filters
 * @returns {{ users: object[], pagination: object }}
 */
async function getUsers(orgId, filters = {}) {
  const { role, isActive, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = { orgId };
  if (role) where.role = role;
  if (typeof isActive === 'boolean') where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        skills: true,
        maxCapacity: true,
        velocity: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            tasksAssigned: true,
            tasksCreated: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single user by ID with summary stats.
 *
 * @param {string} id
 * @returns {object}
 */
async function getUser(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      skills: true,
      maxCapacity: true,
      velocity: true,
      avatarUrl: true,
      phone: true,
      slackId: true,
      isActive: true,
      createdAt: true,
      orgId: true,
      org: { select: { id: true, name: true, slug: true } },
      _count: {
        select: {
          tasksAssigned: true,
          tasksCreated: true,
          tasksLead: true,
        },
      },
    },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

/**
 * Update a user's profile fields.
 *
 * @param {string} id
 * @param {{ name?: string, phone?: string, skills?: string[], avatarUrl?: string, maxCapacity?: number, velocity?: number, role?: string, isActive?: boolean }} data
 * @returns {object} Updated user
 */
async function updateUser(id, data) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = ['name', 'phone', 'skills', 'avatarUrl', 'maxCapacity', 'velocity', 'role', 'isActive', 'slackId'];
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      skills: true,
      maxCapacity: true,
      velocity: true,
      avatarUrl: true,
      phone: true,
      slackId: true,
      isActive: true,
    },
  });

  logger.info('User updated', { userId: id });
  return user;
}

/**
 * Get detailed task stats for a specific user.
 *
 * @param {string} id
 * @returns {{ totalAssigned, totalCreated, completed, inProgress, completionRate, avgCompletionHours }}
 */
async function getUserStats(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const [totalAssigned, totalCreated, statusBreakdown] = await Promise.all([
    prisma.task.count({ where: { assigneeId: id } }),
    prisma.task.count({ where: { createdById: id } }),
    prisma.task.groupBy({
      by: ['status'],
      where: { assigneeId: id },
      _count: { id: true },
    }),
  ]);

  const statusMap = statusBreakdown.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  const completed = (statusMap.COMPLETED || 0) + (statusMap.DELIVERED || 0);
  const inProgress = statusMap.IN_PROGRESS || 0;
  const completionRate = totalAssigned > 0
    ? Math.round((completed / totalAssigned) * 100)
    : 0;

  // Calculate average completion time for finished tasks
  const completedTasks = await prisma.task.findMany({
    where: {
      assigneeId: id,
      status: { in: ['COMPLETED', 'DELIVERED'] },
      completedAt: { not: null },
    },
    select: {
      createdAt: true,
      completedAt: true,
    },
  });

  let avgCompletionHours = 0;
  if (completedTasks.length > 0) {
    const totalHours = completedTasks.reduce((sum, t) => {
      return sum + (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
    }, 0);
    avgCompletionHours = Math.round((totalHours / completedTasks.length) * 10) / 10;
  }

  return {
    totalAssigned,
    totalCreated,
    completed,
    inProgress,
    byStatus: statusMap,
    completionRate,
    avgCompletionHours,
  };
}

/**
 * Get current team capacity across all active members of an org.
 *
 * @param {string} orgId
 * @returns {Array<{ userId, name, role, skills, activeTasks, maxCapacity, utilization, availableSlots }>}
 */
async function getTeamCapacity(orgId) {
  const users = await prisma.user.findMany({
    where: {
      orgId,
      isActive: true,
      role: { in: ['DEVELOPER', 'TEAM_LEAD'] },
    },
    select: {
      id: true,
      name: true,
      role: true,
      skills: true,
      maxCapacity: true,
      velocity: true,
      avatarUrl: true,
      _count: {
        select: {
          tasksAssigned: {
            where: {
              status: { in: ['ASSIGNED', 'IN_PROGRESS', 'REVIEW'] },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return users.map((u) => {
    const activeTasks = u._count.tasksAssigned;
    const utilization = u.maxCapacity > 0
      ? Math.round((activeTasks / u.maxCapacity) * 100)
      : 0;

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      skills: u.skills,
      avatarUrl: u.avatarUrl,
      activeTasks,
      maxCapacity: u.maxCapacity,
      velocity: u.velocity,
      utilization,
      availableSlots: Math.max(0, u.maxCapacity - activeTasks),
    };
  });
}

module.exports = {
  getUsers,
  getUser,
  updateUser,
  getUserStats,
  getTeamCapacity,
};
