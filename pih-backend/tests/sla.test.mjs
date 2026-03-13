import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { calculateSLADeadline, getSLAStatus } = require('../src/utils/sla');

describe('SLA utilities', () => {
  describe('calculateSLADeadline', () => {
    const baseDate = new Date('2026-01-01T00:00:00Z');

    it('uses default hours per priority', () => {
      const urgent = calculateSLADeadline('URGENT', {}, baseDate);
      expect(urgent.getTime() - baseDate.getTime()).toBe(24 * 3600 * 1000);

      const high = calculateSLADeadline('HIGH', {}, baseDate);
      expect(high.getTime() - baseDate.getTime()).toBe(48 * 3600 * 1000);

      const normal = calculateSLADeadline('NORMAL', {}, baseDate);
      expect(normal.getTime() - baseDate.getTime()).toBe(96 * 3600 * 1000);

      const low = calculateSLADeadline('LOW', {}, baseDate);
      expect(low.getTime() - baseDate.getTime()).toBe(168 * 3600 * 1000);
    });

    it('uses custom SLA config when provided', () => {
      const config = { urgent_hours: 4, high_hours: 8 };
      const urgent = calculateSLADeadline('URGENT', config, baseDate);
      expect(urgent.getTime() - baseDate.getTime()).toBe(4 * 3600 * 1000);
    });

    it('falls back to normal_hours for unknown priority', () => {
      const result = calculateSLADeadline('UNKNOWN', {}, baseDate);
      expect(result.getTime() - baseDate.getTime()).toBe(96 * 3600 * 1000);
    });
  });

  describe('getSLAStatus', () => {
    it('returns "none" for null deadline', () => {
      expect(getSLAStatus(null)).toEqual({ status: 'none', hoursRemaining: null });
    });

    it('returns "breached" for past deadline', () => {
      const pastDate = new Date(Date.now() - 2 * 3600 * 1000);
      const result = getSLAStatus(pastDate);
      expect(result.status).toBe('breached');
      expect(result.hoursRemaining).toBeLessThanOrEqual(0);
    });

    it('returns "warning" for deadline within 12 hours', () => {
      const soonDate = new Date(Date.now() + 6 * 3600 * 1000);
      const result = getSLAStatus(soonDate);
      expect(result.status).toBe('warning');
    });

    it('returns "on_track" for deadline far in the future', () => {
      const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
      const result = getSLAStatus(futureDate);
      expect(result.status).toBe('on_track');
    });
  });
});
