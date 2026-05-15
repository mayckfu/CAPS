import { describe, it, expect } from 'vitest';
import { 
  normalizeMesRef, 
  formatMesRef, 
  buildRecordConsolidation 
} from './recordConsolidation';

describe('Record Consolidation Utils', () => {
  describe('normalizeMesRef', () => {
    it('should format 6 digits into MM/YYYY', () => {
      expect(normalizeMesRef('052026')).toBe('05/2026');
    });
    it('should handle non-digit characters', () => {
      expect(normalizeMesRef('05-2026')).toBe('05/2026');
    });
    it('should return original if not 6 digits', () => {
      expect(normalizeMesRef('05/26')).toBe('05/26');
    });
  });

  describe('formatMesRef', () => {
    it('should convert MM/YYYY to "Month de Year"', () => {
      expect(formatMesRef('052026')).toBe('Maio de 2026');
      expect(formatMesRef('122025')).toBe('Dezembro de 2025');
    });
    it('should return - for empty input', () => {
      expect(formatMesRef('')).toBe('-');
    });
  });

  describe('buildRecordConsolidation', () => {
    it('should correctly consolidate RAAS procedures across multiple records', () => {
      const records = [
        { '0301080208_d1': 'X', '0301080208_d2': 'X' },
        { '0301080208_d1': 'X', '0301080208_d5': 'X' }
      ];
      
      const result = buildRecordConsolidation(records);
      
      const raasGroup = result.groups.find(g => g.title === 'RAAS');
      const item = raasGroup.items.find(i => i.code === '0301080208');
      
      // Total quantity should be 4 (2 marks in first record, 2 in second)
      expect(item.quantity).toBe(4);
      // Detail should mention day 1 twice
      expect(item.detail).toContain('1 (2x)');
      expect(item.detail).toContain('2');
      expect(item.detail).toContain('5');
    });

    it('should correctly consolidate BPA Consolidado procedures', () => {
      const records = [
        { '0301100039_b1': '2', '0301100039_b2': '1' },
        { '0301100039_b1': '3' }
      ];
      
      const result = buildRecordConsolidation(records);
      const bpaGroup = result.groups.find(g => g.title === 'BPA Consolidado');
      const item = bpaGroup.items.find(i => i.code === '0301100039');
      
      expect(item.quantity).toBe(6); // 2 + 1 + 3
      expect(item.detail).toContain('1ª (5x)');
      expect(item.detail).toContain('2ª (1x)');
    });
  });
});
