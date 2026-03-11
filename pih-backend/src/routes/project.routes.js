const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const projectService = require('../services/project.service');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await projectService.getProjects(req.user.orgId, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await projectService.getProject(req.params.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await projectService.getProjectStats(req.params.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const project = await projectService.createProject({
        ...req.body,
        orgId: req.user.orgId,
      });
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const project = await projectService.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
