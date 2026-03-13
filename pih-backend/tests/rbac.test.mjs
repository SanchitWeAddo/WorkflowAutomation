import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { authorize } = require('../src/middleware/rbac');

function mockReqResNext(role) {
  const req = { user: { role, orgId: 'org-1' } };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('RBAC middleware', () => {
  describe('authorize', () => {
    it('allows access for matching role', () => {
      const middleware = authorize('ADMIN', 'TEAM_LEAD');
      const { req, res, next } = mockReqResNext('ADMIN');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('denies access for non-matching role', () => {
      const middleware = authorize('ADMIN');
      const { req, res, next } = mockReqResNext('DEVELOPER');
      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 when user is not set', () => {
      const middleware = authorize('ADMIN');
      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
