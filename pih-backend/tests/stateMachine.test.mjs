import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateTransition, getTimestampField, TRANSITIONS } = require('../src/utils/stateMachine');

describe('State Machine', () => {
  describe('validateTransition', () => {
    it('allows valid DEVELOPER transitions', () => {
      expect(validateTransition('ASSIGNED', 'IN_PROGRESS', 'DEVELOPER')).toBe(true);
      expect(validateTransition('IN_PROGRESS', 'REVIEW', 'DEVELOPER')).toBe(true);
    });

    it('allows valid TEAM_LEAD transitions', () => {
      expect(validateTransition('ACKNOWLEDGED', 'ASSIGNED', 'TEAM_LEAD')).toBe(true);
      expect(validateTransition('REVIEW', 'COMPLETED', 'TEAM_LEAD')).toBe(true);
    });

    it('allows valid CLIENT transitions', () => {
      expect(validateTransition('CLIENT_REVIEW', 'DELIVERED', 'CLIENT')).toBe(true);
      expect(validateTransition('CLIENT_REVIEW', 'REOPENED', 'CLIENT')).toBe(true);
    });

    it('allows ADMIN to do any valid transition', () => {
      expect(validateTransition('SUBMITTED', 'ACKNOWLEDGED', 'ADMIN')).toBe(true);
      expect(validateTransition('SUBMITTED', 'CANCELLED', 'ADMIN')).toBe(true);
    });

    it('throws 400 for invalid transition', () => {
      expect(() => validateTransition('SUBMITTED', 'DELIVERED', 'ADMIN'))
        .toThrow('Invalid transition');
    });

    it('throws 403 for unauthorized role', () => {
      expect(() => validateTransition('ASSIGNED', 'IN_PROGRESS', 'CLIENT'))
        .toThrow('Role CLIENT cannot perform transition');
    });

    it('prevents transitions from terminal states', () => {
      expect(() => validateTransition('DELIVERED', 'SUBMITTED', 'ADMIN'))
        .toThrow('Invalid transition');
      expect(() => validateTransition('CANCELLED', 'SUBMITTED', 'ADMIN'))
        .toThrow('Invalid transition');
    });
  });

  describe('getTimestampField', () => {
    it('returns correct timestamp field for known statuses', () => {
      expect(getTimestampField('ACKNOWLEDGED')).toBe('acknowledgedAt');
      expect(getTimestampField('ASSIGNED')).toBe('assignedAt');
      expect(getTimestampField('IN_PROGRESS')).toBe('startedAt');
      expect(getTimestampField('COMPLETED')).toBe('completedAt');
      expect(getTimestampField('DELIVERED')).toBe('deliveredAt');
    });

    it('returns null for statuses without timestamp fields', () => {
      expect(getTimestampField('SUBMITTED')).toBeNull();
      expect(getTimestampField('REVIEW')).toBeNull();
      expect(getTimestampField('CANCELLED')).toBeNull();
    });
  });

  describe('TRANSITIONS completeness', () => {
    it('has entries for all expected statuses', () => {
      const expected = [
        'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
        'REVIEW', 'COMPLETED', 'CLIENT_REVIEW', 'DELIVERED',
        'REOPENED', 'CANCELLED',
      ];
      expect(Object.keys(TRANSITIONS).sort()).toEqual(expected.sort());
    });

    it('terminal states have no outgoing transitions', () => {
      expect(TRANSITIONS.DELIVERED).toEqual([]);
      expect(TRANSITIONS.CANCELLED).toEqual([]);
    });
  });
});
