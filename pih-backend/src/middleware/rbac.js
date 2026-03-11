/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.get('/admin', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), handler);
 *
 * Roles hierarchy (most to least privileged):
 *   SUPER_ADMIN > ADMIN > TEAM_LEAD > DEVELOPER > CLIENT
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
}

/**
 * Ensure the authenticated user belongs to the same organization
 * as the resource being accessed.  SUPER_ADMIN bypasses this check.
 */
function requireSameOrg(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const orgId = req.params.orgId || req.body.orgId || req.query.orgId;

  if (orgId && orgId !== req.user.orgId && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Cross-organization access denied' });
  }

  next();
}

module.exports = { authorize, requireSameOrg };
