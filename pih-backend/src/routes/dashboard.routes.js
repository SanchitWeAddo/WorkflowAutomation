const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dashboardService = require('../services/dashboard.service');

router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const stats = await dashboardService.getOverviewStats(req.user.orgId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/workload', authenticate, async (req, res, next) => {
  try {
    const workload = await dashboardService.getTeamWorkload(req.user.orgId);
    res.json(workload);
  } catch (err) {
    next(err);
  }
});

router.get('/delivery', authenticate, async (req, res, next) => {
  try {
    const metrics = await dashboardService.getDeliveryMetrics(
      req.user.orgId,
      req.query.dateFrom,
      req.query.dateTo
    );
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

router.get('/delays', authenticate, async (req, res, next) => {
  try {
    const analysis = await dashboardService.getDelayAnalysis(req.user.orgId);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

router.get('/resources', authenticate, async (req, res, next) => {
  try {
    const utilization = await dashboardService.getResourceUtilization(req.user.orgId);
    res.json(utilization);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
