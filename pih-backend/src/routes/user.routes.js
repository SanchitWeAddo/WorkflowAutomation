const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const userService = require('../services/user.service');

// IMPORTANT: Place /team/capacity before /:id to avoid matching "team" as an id
router.get('/team/capacity', authenticate, async (req, res, next) => {
  try {
    const capacity = await userService.getTeamCapacity(req.user.orgId);
    res.json(capacity);
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.user.orgId, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id, req.user.orgId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await userService.getUserStats(req.params.id, req.user.orgId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD'),
  async (req, res, next) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user.orgId, req.user);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
