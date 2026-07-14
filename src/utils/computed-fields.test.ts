import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { calculateAge, calculateDaysToBirthday, getZodiacSign, generateOccurrences } from './computed-fields';
import { ReminderItemWithDetails } from '@/app/actions/reminders';

describe('Computed Fields', () => {
  describe('calculateAge', () => {
    it('calculates correct age before birthday', () => {
      assert.strictEqual(calculateAge('1990-05-15', '2020-04-10'), 29);
    });
    
    it('calculates correct age after birthday', () => {
      assert.strictEqual(calculateAge('1990-05-15', '2020-06-10'), 30);
    });
  });

  describe('calculateDaysToBirthday', () => {
    it('calculates days to upcoming birthday in same year', () => {
      assert.strictEqual(calculateDaysToBirthday('1990-03-15', '2024-03-01'), 14);
    });
    
    it('calculates days to upcoming birthday next year', () => {
      assert.strictEqual(calculateDaysToBirthday('1990-01-01', '2023-12-30'), 2);
    });

    it('handles Feb 29 on non-leap year (celebrates on Feb 28)', () => {
      assert.strictEqual(calculateDaysToBirthday('2000-02-29', '2023-02-20'), 8);
    });

    it('handles Feb 29 on leap year (celebrates on Feb 29)', () => {
      assert.strictEqual(calculateDaysToBirthday('2000-02-29', '2024-02-20'), 9);
    });
  });

  describe('getZodiacSign', () => {
    it('identifies Aries correctly', () => {
      assert.strictEqual(getZodiacSign('1990-03-25'), 'Aries');
    });
    
    it('identifies Pisces correctly', () => {
      assert.strictEqual(getZodiacSign('1990-03-15'), 'Pisces');
    });
  });

  describe('generateOccurrences', () => {
    it('generates correct occurrences for a task', () => {
      const item: ReminderItemWithDetails = {
        id: '1', user_id: 'u1', category: 'task', name: 'Test task',
        created_at: '', updated_at: '',
        task_details: { due_at: '2026-07-15T12:00:00Z' }
      };
      const start = new Date('2026-07-01T00:00:00Z');
      const end = new Date('2026-07-31T00:00:00Z');
      const today = new Date('2026-07-10T00:00:00Z');
      
      const occurrences = generateOccurrences([item], start, end, today);
      assert.strictEqual(occurrences.length, 1);
      assert.strictEqual(occurrences[0].date.getTime(), new Date('2026-07-15T00:00:00.000Z').getTime());
      assert.strictEqual(occurrences[0].status, 'upcoming');
    });

    it('generates correct occurrences for a yearly birthday handling Feb 29', () => {
      const item: ReminderItemWithDetails = {
        id: '2', user_id: 'u1', category: 'person', name: 'Leapling',
        created_at: '', updated_at: '',
        person_details: { birthdate: '2000-02-29' }
      };
      
      // Test non-leap year (2023)
      let occurrences = generateOccurrences([item], new Date('2023-01-01'), new Date('2023-12-31'), new Date('2023-01-01'));
      assert.strictEqual(occurrences.length, 1);
      assert.strictEqual(occurrences[0].date.getTime(), new Date('2023-02-28T00:00:00.000Z').getTime());

      // Test leap year (2024)
      occurrences = generateOccurrences([item], new Date('2024-01-01'), new Date('2024-12-31'), new Date('2024-01-01'));
      assert.strictEqual(occurrences.length, 1);
      assert.strictEqual(occurrences[0].date.getTime(), new Date('2024-02-29T00:00:00.000Z').getTime());
    });

    it('handles escalation state for completed tasks', () => {
      const item: ReminderItemWithDetails = {
        id: '3', user_id: 'u1', category: 'task', name: 'Completed task',
        created_at: '', updated_at: '',
        task_details: { due_at: '2026-07-05T12:00:00Z' },
        escalation_state: [
          { occurrence_date: '2026-07-05', marked_done_at: '2026-07-05T14:00:00Z' }
        ]
      };
      
      const occurrences = generateOccurrences([item], new Date('2026-07-01'), new Date('2026-07-31'), new Date('2026-07-10'));
      assert.strictEqual(occurrences.length, 1);
      assert.strictEqual(occurrences[0].status, 'completed-past');
    });
  });
});
