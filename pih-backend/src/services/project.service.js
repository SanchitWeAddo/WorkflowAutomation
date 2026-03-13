const prisma = require('../config/prisma');
const logger = require('../utils/logger');

/**
 * Create a new project.
 *
 * @param {{ name: string, description?: string, orgId: string, clientId: string, status?: string, slaConfig?: object }} data
 * @returns {object} Created project
 */
async function createProject(data) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description || null,
      orgId: data.orgId,
      clientId: data.clientId,
      status: data.status || 'active',
      slaConfig: data.slaConfig || undefined,
    },
  });

  logger.info('Project created', { projectId: project.id, name: project.name, orgId: data.orgId });
  return project;
}

/**
 * Get a single project by ID, including task counts.
 *
 * @param {string} id
 * @returns {object}
 */
async function getProject(id, orgId) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (!project || (orgId && project.orgId !== orgId)) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  // Fetch status breakdown for the project
  const statusCounts = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId: id },
    _count: { id: true },
  });

  return {
    ...project,
    taskCounts: {
      total: project._count.tasks,
      byStatus: statusCounts.reduce((acc, s) => {
        acc[s.status] = s._count.id;
        return acc;
      }, {}),
    },
  };
}

/**
 * List projects for an org with pagination and optional filters.
 *
 * @param {string} orgId
 * @param {{ status?: string, search?: string, page?: number, limit?: number }} filters
 * @returns {{ projects: object[], pagination: object }}
 */
async function getProjects(orgId, filters = {}) {
  const { status, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = { orgId };
  if (status) where.status = status;
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update a project.
 *
 * @param {string} id
 * @param {{ name?: string, description?: string, status?: string, slaConfig?: object }} data
 * @returns {object} Updated project
 */
async function updateProject(id, data, orgId) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || (orgId && existing.orgId !== orgId)) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.slaConfig !== undefined) updateData.slaConfig = data.slaConfig;

  const project = await prisma.project.update({
    where: { id },
    data: updateData,
  });

  logger.info('Project updated', { projectId: id });
  return project;
}

/**
 * Get detailed stats for a project: task breakdown by status and priority.
 *
 * @param {string} id
 * @returns {{ projectId, totalTasks, byStatus, byPriority, slaBreachCount, completionRate }}
 */
async function getProjectStats(id, orgId) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || (orgId && project.orgId !== orgId)) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const [statusBreakdown, priorityBreakdown, totalTasks, slaBreachCount, completedCount] = await Promise.all([
    prisma.task.groupBy({
      by: ['status'],
      where: { projectId: id },
      _count: { id: true },
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where: { projectId: id },
      _count: { id: true },
    }),
    prisma.task.count({ where: { projectId: id } }),
    prisma.task.count({ where: { projectId: id, slaBreached: true } }),
    prisma.task.count({
      where: { projectId: id, status: { in: ['COMPLETED', 'DELIVERED'] } },
    }),
  ]);

  return {
    projectId: id,
    totalTasks,
    byStatus: statusBreakdown.reduce((acc, s) => {
      acc[s.status] = s._count.id;
      return acc;
    }, {}),
    byPriority: priorityBreakdown.reduce((acc, p) => {
      acc[p.priority] = p._count.id;
      return acc;
    }, {}),
    slaBreachCount,
    completionRate: totalTasks > 0
      ? Math.round((completedCount / totalTasks) * 100)
      : 0,
  };
}

module.exports = {
  createProject,
  getProject,
  getProjects,
  updateProject,
  getProjectStats,
};
