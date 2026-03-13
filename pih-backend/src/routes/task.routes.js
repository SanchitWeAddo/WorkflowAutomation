const express = require('express');
const router = express.Router();
const multer = require('multer');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createTaskSchema,
  updateStatusSchema,
  assignTaskSchema,
  commentSchema,
  parseTaskSchema,
} = require('../validators/task.validator');
const taskService = require('../services/task.service');
const aiService = require('../services/ai.service');
const { getIO } = require('../socket');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// List tasks
router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = { ...req.query };
    // Resolve "me" aliases
    if (query.assigneeId === 'me') query.assigneeId = req.user.id;
    if (query.createdById === 'me') query.createdById = req.user.id;

    const result = await taskService.getTasks({
      ...query,
      orgId: req.user.orgId,
      createdById: req.user.role === 'CLIENT' ? req.user.id : query.createdById,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get single task
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const task = await taskService.getTask(req.params.id, req.user.orgId);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Create task
router.post('/', authenticate, validate(createTaskSchema), async (req, res, next) => {
  try {
    const task = await taskService.createTask({
      ...req.body,
      orgId: req.user.orgId,
      createdById: req.user.id,
    });

    try {
      getIO().to(`org:${req.user.orgId}`).emit('task:created', task);
    } catch (_) {}

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// AI parse task from raw text
router.post('/parse', authenticate, validate(parseTaskSchema), async (req, res, next) => {
  try {
    const parsed = await aiService.parseTaskFromText(
      req.body.rawText,
      req.body.source,
      req.body.sourceRef
    );
    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

// Update task status
router.patch('/:id/status', authenticate, validate(updateStatusSchema), async (req, res, next) => {
  try {
    const task = await taskService.updateStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      req.user.role,
      req.body.note,
      req.user.orgId
    );

    try {
      getIO().to(`task:${task.id}`).to(`org:${req.user.orgId}`).emit('task:updated', task);
    } catch (_) {}

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Assign task
router.patch(
  '/:id/assign',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD'),
  validate(assignTaskSchema),
  async (req, res, next) => {
    try {
      const task = await taskService.assignTask(
        req.params.id,
        req.body.assigneeId,
        req.user.id,
        req.body.note,
        req.user.orgId
      );

      try {
        getIO().to(req.body.assigneeId).emit('task:assigned', task);
        getIO().to(`task:${task.id}`).emit('task:updated', task);
      } catch (_) {}

      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

// Handoff lead
router.patch(
  '/:id/handoff',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD'),
  async (req, res, next) => {
    try {
      const task = await taskService.handoffTask(
        req.params.id,
        req.body.newLeadId,
        req.user.id,
        req.body.note,
        req.user.orgId
      );
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

// Client accept/reject
router.patch('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const task = await taskService.acceptTask(
      req.params.id,
      req.body.accepted,
      req.user.id,
      req.body.feedback,
      req.user.orgId
    );
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Add comment
router.post('/:id/comments', authenticate, validate(commentSchema), async (req, res, next) => {
  try {
    const event = await taskService.addComment(
      req.params.id,
      req.user.id,
      req.body.content,
      req.body.isInternal,
      req.user.orgId
    );

    try {
      getIO().to(`task:${req.params.id}`).emit('task:comment', event);
    } catch (_) {}

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

// Upload attachment
router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const attachment = await taskService.addAttachment(req.params.id, req.file, req.user.id, req.user.orgId);
    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
});

// AI suggest assignee
router.get(
  '/:id/suggest-assignee',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD'),
  async (req, res, next) => {
    try {
      const task = await taskService.getTask(req.params.id, req.user.orgId);
      const suggestion = await aiService.suggestAssignee(task, req.user.orgId);
      res.json(suggestion);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
