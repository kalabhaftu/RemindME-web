export function calculateAge(birthdateStr: string, targetDateStr?: string): number {
  const birthdate = new Date(birthdateStr);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  
  let age = targetDate.getUTCFullYear() - birthdate.getUTCFullYear();
  
  const m = targetDate.getUTCMonth() - birthdate.getUTCMonth();
  if (m < 0 || (m === 0 && targetDate.getUTCDate() < birthdate.getUTCDate())) {
    age--;
  }
  
  return age;
}

export function calculateDaysToBirthday(birthdateStr: string, targetDateStr?: string): number {
  const birthdate = new Date(birthdateStr);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  
  // Create a Date object for the next birthday in the target year
  let nextBirthday = new Date(Date.UTC(targetDate.getUTCFullYear(), birthdate.getUTCMonth(), birthdate.getUTCDate()));
  
  // Handle Feb 29 edge case for non-leap years
  if (birthdate.getUTCMonth() === 1 && birthdate.getUTCDate() === 29) {
    const isLeapYear = (year: number) => ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    if (!isLeapYear(targetDate.getUTCFullYear())) {
      // In non-leap years, Feb 29 birthday is celebrated on Feb 28
      nextBirthday = new Date(Date.UTC(targetDate.getUTCFullYear(), 1, 28));
    }
  }

  // If the birthday has already passed this year (ignoring time by zeroing out time in targetDate for comparison)
  const targetDateZeroed = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
  if (nextBirthday.getTime() < targetDateZeroed.getTime()) {
    // Next birthday is next year
    const nextYear = targetDate.getUTCFullYear() + 1;
    if (birthdate.getUTCMonth() === 1 && birthdate.getUTCDate() === 29) {
      const isLeapYear = (year: number) => ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
      nextBirthday = new Date(Date.UTC(nextYear, 1, isLeapYear(nextYear) ? 29 : 28));
    } else {
      nextBirthday = new Date(Date.UTC(nextYear, birthdate.getUTCMonth(), birthdate.getUTCDate()));
    }
  }
  
  const diffTime = Math.abs(nextBirthday.getTime() - targetDateZeroed.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}

export function getZodiacSign(birthdateStr: string): string {
  const date = new Date(birthdateStr);
  const month = date.getUTCMonth() + 1; // 1-12
  const day = date.getUTCDate();
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';
  
  return 'Unknown';
}

import { ReminderItemWithDetails } from '@/app/actions/reminders';
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, isEqual, startOfDay, isLeapYear, setDate, setMonth, setYear, format } from 'date-fns';

export type OccurrenceStatus = 'upcoming' | 'today' | 'completed-past' | 'missed-past';

export type ReminderOccurrence = {
  date: Date;
  item: ReminderItemWithDetails;
  status: OccurrenceStatus;
};

function getStatusForDate(
  date: Date, 
  today: Date, 
  itemId: string, 
  escalationState: ReminderItemWithDetails['escalation_state']
): OccurrenceStatus {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dStart = startOfDay(date);
  const tStart = startOfDay(today);

  // Check escalation state first
  const state = escalationState?.find(s => s.occurrence_date === dateStr);
  if (state?.marked_done_at) {
    return 'completed-past';
  }

  if (isEqual(dStart, tStart)) return 'today';
  if (isBefore(dStart, tStart)) return 'missed-past';
  return 'upcoming';
}

export function generateOccurrences(
  items: ReminderItemWithDetails[],
  startDate: Date,
  endDate: Date,
  today: Date = new Date()
): ReminderOccurrence[] {
  const occurrences: ReminderOccurrence[] = [];
  const startD = startOfDay(startDate);
  const endD = startOfDay(endDate);

  for (const item of items) {
    // Determine the base date and recurrence rules based on category
    let currentDates: Date[] = [];

    if (item.category === 'person' && item.person_details?.[0]?.birthdate) {
      // Birthdays repeat yearly
      const bd = new Date(item.person_details[0].birthdate);
      let curr = new Date(bd);
      curr.setUTCFullYear(startD.getUTCFullYear());
      if (curr.getTime() < startD.getTime()) curr.setUTCFullYear(curr.getUTCFullYear() + 1);

      while (!isAfter(curr, endD)) {
        // Handle leap year Feb 29
        let occurrenceDate = new Date(curr);
        if (bd.getUTCMonth() === 1 && bd.getUTCDate() === 29 && !isLeapYear(occurrenceDate)) {
          occurrenceDate = setDate(setMonth(occurrenceDate, 1), 28);
        }
        if (!isBefore(occurrenceDate, startD) && !isAfter(occurrenceDate, endD)) {
          currentDates.push(occurrenceDate);
        }
        curr = addYears(curr, 1);
      }
    } else if (item.category === 'subscription' && item.subscription_details?.[0]?.renewal_date) {
      const rd = new Date(item.subscription_details[0].renewal_date);
      const cycle = item.subscription_details[0].cycle || 'monthly';
      let curr = new Date(rd);

      // Fast forward to start Date
      while (isBefore(curr, startD)) {
        if (cycle === 'weekly') curr = addWeeks(curr, 1);
        else if (cycle === 'monthly') curr = addMonths(curr, 1);
        else if (cycle === 'yearly') curr = addYears(curr, 1);
        else curr = addDays(curr, 1); // custom_days not fully supported yet in spec without a number
      }

      while (!isAfter(curr, endD)) {
        currentDates.push(curr);
        if (cycle === 'weekly') curr = addWeeks(curr, 1);
        else if (cycle === 'monthly') curr = addMonths(curr, 1);
        else if (cycle === 'yearly') curr = addYears(curr, 1);
        else curr = addDays(curr, 1);
      }
    } else if (item.category === 'task' && item.task_details?.[0]?.due_at) {
      const due = new Date(item.task_details[0].due_at);
      const rr = item.recurrence_rules?.[0];

      if (!rr || rr.frequency === 'none') {
        if (!isBefore(due, startD) && !isAfter(due, endD)) {
          currentDates.push(due);
        }
      } else {
        let curr = new Date(due);
        const freq = rr.frequency;
        const interval = rr.interval_count || 1;
        let count = 0;

        // Fast forward
        while (isBefore(curr, startD)) {
          if (rr.ends === 'after_occurrences' && rr.ends_value && count >= parseInt(rr.ends_value)) break;
          if (rr.ends === 'on_date' && rr.ends_value && isAfter(curr, new Date(rr.ends_value))) break;

          if (freq === 'daily') curr = addDays(curr, interval);
          else if (freq === 'weekly') curr = addWeeks(curr, interval);
          else if (freq === 'monthly') curr = addMonths(curr, interval);
          else if (freq === 'yearly') curr = addYears(curr, interval);
          count++;
        }

        while (!isAfter(curr, endD)) {
          if (rr.ends === 'after_occurrences' && rr.ends_value && count >= parseInt(rr.ends_value)) break;
          if (rr.ends === 'on_date' && rr.ends_value && isAfter(curr, new Date(rr.ends_value))) break;

          currentDates.push(curr);

          if (freq === 'daily') curr = addDays(curr, interval);
          else if (freq === 'weekly') curr = addWeeks(curr, interval);
          else if (freq === 'monthly') curr = addMonths(curr, interval);
          else if (freq === 'yearly') curr = addYears(curr, interval);
          count++;
        }
      }
    }

    // Map calculated dates to occurrences
    for (const d of currentDates) {
      occurrences.push({
        date: startOfDay(d), // normalise to start of day for calendar comparison
        item,
        status: getStatusForDate(d, today, item.id, item.escalation_state)
      });
    }
  }

  // Sort by date ascending
  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}
