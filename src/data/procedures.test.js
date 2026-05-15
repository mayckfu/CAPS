import { describe, it, expect } from 'vitest';
import { calcTotal, calcBpaTotal, dayKey, bpaKey } from './procedures';

describe('Procedures Data Logic', () => {
  describe('dayKey', () => {
    it('should generate correct key for a procedure and day', () => {
      expect(dayKey('123', 5)).toBe('123_d5');
      expect(dayKey('ABC', 31)).toBe('ABC_d31');
    });
  });

  describe('bpaKey', () => {
    it('should generate correct key for a procedure and column', () => {
      expect(bpaKey('123', 1)).toBe('123_b1');
      expect(bpaKey('XYZ', 4)).toBe('XYZ_b4');
    });
  });

  describe('calcTotal', () => {
    it('should count marked days (X) correctly', () => {
      const mockData = {
        '0301080208_d1': 'X',
        '0301080208_d2': '',
        '0301080208_d3': 'X',
        '0301080208_d31': 'X',
      };
      expect(calcTotal('0301080208', mockData)).toBe(3);
    });

    it('should return 0 when no days are marked', () => {
      const mockData = {
        '0301080208_d1': '',
        '0301080208_d2': '',
      };
      expect(calcTotal('0301080208', mockData)).toBe(0);
    });
  });

  describe('calcBpaTotal', () => {
    it('should sum columns correctly', () => {
      const mockData = {
        '0301100039_b1': '2',
        '0301100039_b2': '5',
        '0301100039_b3': '',
        '0301100039_b4': '1',
      };
      expect(calcBpaTotal('0301100039', mockData)).toBe(8);
    });

    it('should handle empty strings and non-numeric values', () => {
      const mockData = {
        '0301100039_b1': '',
        '0301100039_b2': 'abc',
        '0301100039_b3': '10',
      };
      expect(calcBpaTotal('0301100039', mockData)).toBe(10);
    });
  });
});
