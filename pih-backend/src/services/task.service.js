const prisma = require('../config/prisma');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { calculateSLADeadline } = require('../utils/sla');
const { validateTransition, getTimestampField } = require('../utils/stateMachine');
const logger = require('../utils/logger');

async function createTask({ title, description, priority = 'NORMAL', category, projectId, orgId, createdById, source = 'portal', sourceRef, aiParsed = false, aiConfidence, tags, estimatedHours, startDate, dueDate, taskBrief, isPrivate = false, isClientDependent = false, qaRequired = false, requiredSkills, assigneeIds, dependsOnTaskIds }) {
  const ticketNumber = await generateTicketNumber();

  let slaConfig = {};
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { slaConfig: true } });
    if (project) slaConfig = project.slaConfig;
  }

  const slaDeadline = calculateSLADeadline(priority, slaConfig);

  const task = await prisma.task.create({
    data: {
      ticketNumber,
      title,
      description,
      priority,
      category,
      projectId,
      orgId,
      createdById,
      source,
      sourceRef,
      aiParsed,
      aiConfidence,
      slaDeadline,
      tags: tags || [],
      estimatedHours,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      taskBrief,
      isPrivate,
      isClientDependent,
      qaRequired,
      requiredSkills: requiredSkills || [],
    },
    include: {
      project: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Create multiple assignees if provided
  if (assigneeIds && assigneeIds.length > 0) {
    await prisma.taskAssignee.createMany({
      data: assigneeIds.map((userId, index) => ({
        taskId: task.id,
        userId,
        orderIndex: index,
      })),
    });
  }

  // Create dependencies if provided
  if (dependsOnTaskIds && dependsOnTaskIds.length > 0) {
    await prisma.taskDependency.createMany({
      data: dependsOnTaskIds.map((depId) => ({
        taskId: task.id,
        dependsOnTaskId: depId,
      })),
    });
  }

  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      eventType: 'status_change',
      toStatus: 'SUBMITTED',
      actorId: createdById,
      actorType: 'user',
      note: `Task created via ${source}`,
      payload: { ticketNumber, priority, category },
    },
  });

  logger.info(`Task created: ${ticketNumber}`, { taskId: task.id, orgId });
  return task;
}

async function getTask(id, orgId, userRole) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      lead: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      events: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { id: true, name: true, role: true } } } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
      attachments: { orderBy: { createdAt: 'desc' } },
      taskAssignees: {
        include: { user: { select: { id: true, name: true, email: true, role: true, skills: true, avatarUrl: true } } },
        orderBy: { orderIndex: 'asc' },
      },
      dependsOn: {
        include: { dependsOnTask: { select: { id: true, ticketNumber: true, title: true, status: true } } },
      },
      dependedBy: {
        include: { task: { select: { id: true, ticketNumber: true, title: true, status: true } } },
      },
    },
  });

  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  if (orgId && task.orgId !== orgId) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  // Filter internal comments for CLIENT role
  if (userRole === 'CLIENT') {
    task.events = task.events.filter(e => {
      if (e.eventType === 'comment') {
        const payload = e.payload || {};
        return !payload.isInternal;
      }
      return true;
    });
  }

  return task;
}

async function getTasks({ status, priority, assigneeId, createdById, projectId, orgId, page = 1, limit = 20, search, isClientDependent, requiredSkill }) {
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (createdById) where.createdById = createdById;
  if (projectId) where.projectId = projectId;
  if (orgId) where.orgId = orgId;
  if (isClientDependent !== undefined) where.isClientDependent = isClientDependent === 'true' || isClientDependent === true;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { ticketNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
        taskAssignees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function updateStatus(taskId, newStatus, actorId, role, note, orgId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (orgId && task.orgId !== orgId)) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  validateTransition(task.status, newStatus, role);

  const timestampField = getTimestampField(newStatus);
  const updateData = { status: newStatus };
  if (timestampField) {
    updateData[timestampField] = new Date();
  }

  // Check for SLA breach
  if (['DELIVERED', 'COMPLETED'].includes(newStatus) && task.slaDeadline) {
    if (new Date() > new Date(task.slaDeadline)) {
      updateData.slaBreached = true;
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.taskEvent.create({
    data: {
      taskId,
      eventType: 'status_change',
      fromStatus: task.status,
      toStatus: newStatus,
      actorId,
      actorType: 'user',
      note,
    },
  });

  logger.info(`Task ${task.ticketNumber} status: ${task.status} -> ${newStatus}`, { taskId, actorId });
  return updated;
}

async function assignTask(taskId, assigneeId, actorId, note, orgId, { taskBrief, estimatedHours, startDate, dueDate } = {}) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (orgId && task.orgId !== orgId)) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee || !assignee.isActive) {
    const err = new Error('Assignee not found or inactive');
    err.statusCode = 400;
    throw err;
  }

  const updateData = { assigneeId, assignedAt: new Date() };

  // Update additional fields if provided during assignment
  if (taskBrief) updateData.taskBrief = taskBrief;
  if (estimatedHours) updateData.estimatedHours = estimatedHours;
  if (startDate) updateData.startDate = new Date(startDate);
  if (dueDate) updateData.dueDate = new Date(dueDate);

  // Transition to ASSIGNED if currently in a valid state
  if (['SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'REOPENED'].includes(task.status)) {
    updateData.status = 'ASSIGNED';
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Also add to taskAssignees
  await prisma.taskAssignee.upsert({
    where: { taskId_userId: { taskId, userId: assigneeId } },
    create: { taskId, userId: assigneeId },
    update: { isActive: true },
  });

  await prisma.taskEvent.create({
    data: {
      taskId,
      eventType: 'assignment',
      fromStatus: task.status,
      toStatus: updated.status,
      actorId,
      actorType: 'user',
      note: note || `Assigned to ${assignee.name}`,
      payload: { assigneeId, assigneeName: assignee.name },
    },
  });

  logger.info(`Task ${task.ticketNumber} assigned to ${assignee.name}`, { taskId, assigneeId, actorId });
  return updated;
}

async function handoffTask(taskId, newLeadId, actorId, note, orgId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (orgId && task.orgId !== orgId)) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  const newLead = await prisma.user.findUnique({ where: { id: newLeadId } });
  if (!newLead || !newLead.isActive) {
    const err = new Error('New lead not found or inactive');
    err.statusCode = 400;
    throw err;
  }

  const previousLeadId = task.leadId;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { leadId: newLeadId },
    include: {
      lead: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.taskEvent.create({
    data: {
      taskId,
      eventType: 'handoff',
      actorId,
      actorType: 'user',
      note: note || `Lead changed to ${newLead.name}`,
      payload: { previousLeadId, newLeadId, newLeadName: newLead.name },
    },
  });

  logger.info(`Task ${task.ticketNumber} lead handoff to ${newLead.name}`, { taskId, newLeadId, actorId });
  return updated;
}

async function acceptTask(taskId, accepted, actorId, feedback, orgId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (orgId && task.orgId !== orgId)) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  if (task.status !== 'CLIENT_REVIEW') {
    const err = new Error('Task must be in CLIENT_REVIEW status to accept/reject');
    err.statusCode = 400;
    throw err;
  }

  const newStatus = accepted ? 'DELIVERED' : 'REOPENED';
  const timestampField = getTimestampField(newStatus);
  const updateData = { status: newStatus };
  if (timestampField) {
    updateData[timestampField] = new Date();
  }
  // Store client feedback for collaboration
  if (feedback && !accepted) {
    updateData.clientFeedback = feedback;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  await prisma.taskEvent.create({
    data: {
      taskId,
      eventType: accepted ? 'client_accepted' : 'client_rejected',
      fromStatus: 'CLIENT_REVIEW',
      toStatus: newStatus,
      actorId,
      actorType: 'user',
      note: feedback || (accepted ? 'Client accepted delivery' : 'Client rejected delivery'),
    },
  });

  logger.info(`Task ${task.ticketNumber} ${accepted ? 'accepted' : 'rejected'} by client`, { taskId, actorId });
  return updated;
}

async function addComment(taskId, actorId, content, isInternal = false, orgId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (orgId && task.orgId !== orgId)) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  const event = await prisma.taskEvent.create({
    data: {
      taskId,
      eventType: 'comment',
      actorId,
      actorType: 'user',
      note: content,
      payload: { isInternal },
    },
    include: {
      actor: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });

  logger.info(`Comment added to task ${task.ticketNumber}`, { taskId, actorId, isInternal });
  return event;
}

async function addAttachment(taskId, file, uploadedBy, orgId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (orgId && task.orgId !== orgId)) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      fileName: file.originalname,
      fileUrl: file.path || file.location || `/uploads/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy,
    },
  });

  await prisma.taskEvent.create({
    data: {
      taskId,
      eventType: 'attachment',
      actorId: uploadedBy,
      actorType: 'user',
      note: `Attachment added: ${file.originalname}`,
      payload: { attachmentId: attachment.id, fileName: file.originalname },
    },
  });

  logger.info(`Attachment added to task ${task.ticketNumber}`, { taskId, attachmentId: attachment.id });
  return attachment;
}

async function updateTask(taskId, updates, actorId, orgId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (orgId && task.orgId !== orgId)) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  const allowedFields = ['startDate', 'dueDate', 'taskBrief', 'estimatedHours', 'isClientDependent', 'qaRequired', 'isPrivate', 'clientFeedback', 'requiredSkills'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (['startDate', 'dueDate'].includes(field)) {
        updateData[field] = updates[field] ? new Date(updates[field]) : null;
      } else {
        updateData[field] = updates[field];
      }
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true } },
      taskAssignees: {
        include: { user: { select: { id: true, name: true, email: true, skills: true } } },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  // Handle multiple assignees update
  if (updates.assigneeIds) {
    // Remove old assignees
    await prisma.taskAssignee.deleteMany({ where: { taskId } });
    // Add new ones
    if (updates.assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: updates.assigneeIds.map((userId, index) => ({
          taskId,
          userId,
          orderIndex: index,
        })),
      });
    }
  }

  // Handle dependencies update
  if (updates.dependsOnTaskIds) {
    await prisma.taskDependency.deleteMany({ where: { taskId } });
    if (updates.dependsOnTaskIds.length > 0) {
      await prisma.taskDependency.createMany({
        data: updates.dependsOnTaskIds.map((depId) => ({
          taskId,
          dependsOnTaskId: depId,
        })),
      });
    }
  }

  await prisma.taskEvent.create({
    data: {
      taskId,
      eventType: 'task_updated',
      actorId,
      actorType: 'user',
      note: 'Task details updated',
      payload: { updatedFields: Object.keys(updateData) },
    },
  });

  logger.info(`Task ${task.ticketNumber} updated`, { taskId, actorId, fields: Object.keys(updateData) });
  return updated;
}

module.exports = {
  createTask,
  getTask,
  getTasks,
  updateStatus,
  assignTask,
  handoffTask,
  acceptTask,
  addComment,
  addAttachment,
  updateTask,
};
