import { describe, test, expect } from '@jest/globals';
import { safeParseAvailability } from '../../src/lib/parse-availability';

describe('safeParseAvailability', () => {
  describe('JSON format input', () => {
    test('should parse valid JSON array', () => {
      const input = '["Monday", "Tuesday", "Wednesday"]';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday']);
    });

    test('should handle empty JSON array', () => {
      const input = '[]';
      const result = safeParseAvailability(input);
      expect(result).toEqual([]);
    });

    test('should filter out empty strings from JSON array', () => {
      const input = '["Monday", "", "Tuesday", "   ", "Wednesday"]';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday']);
    });

    test('should handle JSON array with non-string values', () => {
      const input = '["Monday", 123, "Tuesday", null, "Wednesday"]';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday']);
    });
  });

  describe('Weekdays and weekends patterns', () => {
    test('should expand "weekdays" to Monday through Friday', () => {
      const result = safeParseAvailability('weekdays');
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    });

    test('should expand "Weekdays" (capitalized) to Monday through Friday', () => {
      const result = safeParseAvailability('Weekdays');
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    });

    test('should expand "WEEKDAYS" (uppercase) to Monday through Friday', () => {
      const result = safeParseAvailability('WEEKDAYS');
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    });

    test('should expand "weekends" to Saturday and Sunday', () => {
      const result = safeParseAvailability('weekends');
      expect(result).toEqual(['Saturday', 'Sunday']);
    });

    test('should expand "Weekends" (capitalized) to Saturday and Sunday', () => {
      const result = safeParseAvailability('Weekends');
      expect(result).toEqual(['Saturday', 'Sunday']);
    });
  });

  describe('Comma-separated values', () => {
    test('should parse comma-separated days', () => {
      const input = 'monday, wednesday, friday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    test('should handle mixed case comma-separated values', () => {
      const input = 'MONDAY, Wednesday, friday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    test('should handle comma-separated values with extra spaces', () => {
      const input = '  monday  ,   wednesday   ,  friday  ';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    test('should filter out empty values in comma-separated list', () => {
      const input = 'monday, , wednesday, , friday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    test('should parse comma-separated locations', () => {
      const input = 'wellington, glenn innes, onehunga';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Wellington', 'Glenn innes', 'Onehunga']);
    });
  });

  describe('Space-separated values', () => {
    test('should parse space-separated days', () => {
      const input = 'monday wednesday friday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    test('should handle multiple spaces between values', () => {
      const input = 'monday    wednesday     friday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    test('should handle mixed case space-separated values', () => {
      const input = 'MONDAY Wednesday friday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
    });

    test('should not split location names with spaces (containing hyphens/underscores)', () => {
      const input = 'wellington-central';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Wellington-central']);
    });

    test('should not split location names with underscores', () => {
      const input = 'glenn_innes_location';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Glenn_innes_location']);
    });
  });

  describe('Single values', () => {
    test('should handle single day value', () => {
      const input = 'monday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Monday']);
    });

    test('should capitalize single value', () => {
      const input = 'wednesday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Wednesday']);
    });

    test('should handle already capitalized single value', () => {
      const input = 'Friday';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Friday']);
    });

    test('should handle single location value', () => {
      const input = 'wellington';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Wellington']);
    });
  });

  describe('Edge cases and invalid input', () => {
    test('should return empty array for null input', () => {
      const result = safeParseAvailability(null);
      expect(result).toEqual([]);
    });

    test('should return empty array for undefined input', () => {
      const result = safeParseAvailability(undefined);
      expect(result).toEqual([]);
    });

    test('should return empty array for empty string', () => {
      const result = safeParseAvailability('');
      expect(result).toEqual([]);
    });

    test('should return empty array for whitespace-only string', () => {
      const result = safeParseAvailability('   ');
      expect(result).toEqual([]);
    });

    test('should handle invalid JSON gracefully', () => {
      const input = '{"invalid": json}';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['{invalid: json}']);
    });

    test('should handle malformed JSON array', () => {
      const input = '["Monday", "Tuesday"';  // Missing closing bracket
      const result = safeParseAvailability(input);
      expect(result).toEqual(['["monday", "tuesday"']);
    });

    test('should handle JSON with mixed valid/invalid structure', () => {
      const input = 'not-valid-json-but-not-empty';
      const result = safeParseAvailability(input);
      expect(result).toEqual(['Not-valid-json-but-not-empty']);
    });
  });

  describe('Real-world migration scenarios', () => {
    test('should handle legacy "weekdays" from old volunteer system', () => {
      // This was the actual error case that caused JSON parse failures
      const result = safeParseAvailability('weekdays');
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    });

    test('should handle mixed legacy formats', () => {
      const inputs = [
        'weekdays',
        'Monday, Wednesday',
        'monday wednesday friday',
        'Wellington',
        '["Tuesday", "Thursday"]'
      ];

      const results = inputs.map(safeParseAvailability);
      
      expect(results[0]).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      expect(results[1]).toEqual(['Monday', 'Wednesday']);
      expect(results[2]).toEqual(['Monday', 'Wednesday', 'Friday']);
      expect(results[3]).toEqual(['Wellington']);
      expect(results[4]).toEqual(['Tuesday', 'Thursday']);
    });

    test('should handle inconsistent capitalization from old systems', () => {
      const inputs = [
        'MONDAY, WEDNESDAY, FRIDAY',
        'monday, wednesday, friday',
        'Monday, wednesday, FRIDAY'
      ];

      inputs.forEach(input => {
        const result = safeParseAvailability(input);
        expect(result).toEqual(['Monday', 'Wednesday', 'Friday']);
      });
    });
  });
});