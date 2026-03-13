const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth.validator');
const authService = require('../services/auth.service');

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, orgId, orgName, orgSlug } = req.body;
    const result = await authService.register(email, password, name, orgId, orgName, orgSlug);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const result = await authService.refreshAccessToken(req.body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
