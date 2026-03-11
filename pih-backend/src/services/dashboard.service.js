const prisma = require('../config/prisma');
const { getSLAStatus } = require('../utils/sla');
const logger = require('../utils/logger');

/**
 * Get high-level overview stats for an organization's dashboard.
 *
 * @param {string} orgId
 * @returns {{ statusCounts, priorityBreakdown, slaBreachCount, createdThisWeek, totalTasks }}
 */
async function getOverviewStats(orgId) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    statusCounts,
    priorityBreakdown,
    slaBreachCount,
    createdThisWeek,
    totalTasks,
  ] = await Promise.all([
    prisma.task.groupBy({
      by: ['status'],
      where: { orgId },
      _count: { id: true },
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where: { orgId },
      _count: { id: true },
    }),
    prisma.task.count({
      where: { orgId, slaBreached: true },
    }),
    prisma.task.count({
      where: { orgId, createdAt: { gte: weekAgo } },
    }),
    prisma.task.count({
      where: { orgId },
    }),
  ]);

  return {
    totalTasks,
    statusCounts: statusCounts.reduce((acc, s) => {
      acc[s.status] = s._count.id;
      return acc;
    }, {}),
    priorityBreakdown: priorityBreakdown.reduce((acc, p) => {
      acc[p.priority] = p._count.id;
      return acc;
    }, {}),
    slaBreachCount,
    createdThisWeek,
  };
}

/**
 * Get per-user active task counts and capacity utilization for the team.
 *
 * @param {string} orgId
 * @returns {Array<{ userId, name, role, activeTasks, maxCapacity, utilization }>}
 */
async function getTeamWorkload(orgId) {
  const users = await prisma.user.findMany({
    where: { orgId, isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      maxCapacity: true,
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

  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    activeTasks: u._count.tasksAssigned,
    maxCapacity: u.maxCapacity,
    utilization: u.maxCapacity > 0
      ? Math.round((u._count.tasksAssigned / u.maxCapacity) * 100)
      : 0,
  }));
}

/**
 * Get delivery performance metrics for a date range.
 *
 * @param {string} orgId
 * @param {Date|string} dateFrom
 * @param {Date|string} dateTo
 * @returns {{ avgCompletionHours, onTimeDeliveryRate, throughput, completedCount }}
 */
async function getDeliveryMetrics(orgId, dateFrom, dateTo) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const completedTasks = await prisma.task.findMany({
    where: {
      orgId,
      status: { in: ['COMPLETED', 'DELIVERED'] },
      completedAt: { gte: from, lte: to },
    },
    select: {
      createdAt: true,
      completedAt: true,
      slaDeadline: true,
      slaBreached: true,
    },
  });

  const completedCount = completedTasks.length;

  if (completedCount === 0) {
    return {
      avgCompletionHours: 0,
      onTimeDeliveryRate: 0,
      throughput: 0,
      completedCount: 0,
    };
  }

  // Average completion time in hours
  const totalHours = completedTasks.reduce((sum, t) => {
    if (t.completedAt && t.createdAt) {
      return sum + (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
    }
    return sum;
  }, 0);
  const avgCompletionHours = Math.round((totalHours / completedCount) * 10) / 10;

  // On-time delivery rate
  const onTimeCount = completedTasks.filter((t) => !t.slaBreached).length;
  const onTimeDeliveryRate = Math.round((onTimeCount / completedCount) * 100);

  // Throughput: tasks completed per week
  const durationWeeks = Math.max(1, (to - from) / (1000 * 60 * 60 * 24 * 7));
  const throughput = Math.round((completedCount / durationWeeks) * 10) / 10;

  return {
    avgCompletionHours,
    onTimeDeliveryRate,
    throughput,
    completedCount,
  };
}

/**
 * Analyze delays: SLA-breached tasks and bottleneck statuses.
 *
 * @param {string} orgId
 * @returns {{ breachedTasks, bottleneckStatuses, atRiskTasks }}
 */
async function getDelayAnalysis(orgId) {
  // Tasks that have breached SLA
  const breachedTasks = await prisma.task.findMany({
    where: {
      orgId,
      slaBreached: true,
      status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] },
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      priority: true,
      slaDeadline: true,
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { slaDeadline: 'asc' },
    take: 50,
  });

  // Find tasks at risk (SLA warning status)
  const activeTasks = await prisma.task.findMany({
    where: {
      orgId,
      slaBreached: false,
      slaDeadline: { not: null },
      status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] },
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      priority: true,
      slaDeadline: true,
      assignee: { select: { id: true, name: true } },
    },
  });

  const atRiskTasks = activeTasks
    .map((t) => {
      const sla = getSLAStatus(t.slaDeadline);
      return { ...t, slaStatus: sla.status, hoursRemaining: sla.hoursRemaining };
    })
    .filter((t) => t.slaStatus === 'warning')
    .sort((a, b) => a.hoursRemaining - b.hoursRemaining);

  // Bottleneck analysis: statuses where tasks are piling up
  const statusCounts = await prisma.task.groupBy({
    by: ['status'],
    where: {
      orgId,
      status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const bottleneckStatuses = statusCounts.map((s) => ({
    status: s.status,
    count: s._count.id,
  }));

  return {
    breachedTasks,
    atRiskTasks,
    bottleneckStatuses,
  };
}

/**
 * Get resource utilization per team member, including skills.
 *
 * @param {string} orgId
 * @returns {Array<{ userId, name, role, skills, activeTasks, maxCapacity, utilization, velocity }>}
 */
async function getResourceUtilization(orgId) {
  const users = await prisma.user.findMany({
    where: { orgId, isActive: true, role: { in: ['DEVELOPER', 'TEAM_LEAD'] } },
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

  // Also fetch recent capacity logs for trend data
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const capacityLogs = await prisma.teamCapacity.findMany({
    where: {
      user: { orgId },
      date: { gte: weekAgo },
    },
    select: {
      userId: true,
      utilizationPct: true,
    },
  });

  const avgUtilByUser = capacityLogs.reduce((acc, log) => {
    if (!acc[log.userId]) acc[log.userId] = { total: 0, count: 0 };
    acc[log.userId].total += log.utilizationPct;
    acc[log.userId].count += 1;
    return acc;
  }, {});

  return users.map((u) => {
    const currentUtil = u.maxCapacity > 0
      ? Math.round((u._count.tasksAssigned / u.maxCapacity) * 100)
      : 0;
    const avgEntry = avgUtilByUser[u.id];
    const weeklyAvgUtilization = avgEntry
      ? Math.round(avgEntry.total / avgEntry.count)
      : currentUtil;

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      skills: u.skills,
      avatarUrl: u.avatarUrl,
      activeTasks: u._count.tasksAssigned,
      maxCapacity: u.maxCapacity,
      utilization: currentUtil,
      weeklyAvgUtilization,
      velocity: u.velocity,
    };
  });
}

module.exports = {
  getOverviewStats,
  getTeamWorkload,
  getDeliveryMetrics,
  getDelayAnalysis,
  getResourceUtilization,
};
