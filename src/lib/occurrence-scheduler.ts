import {
  parseISO,
  setYear,
  isBefore,
  startOfDay,
  addYears,
  addMonths,
  addWeeks,
  addDays,
  setHours,
  setMinutes,
} from 'date-fns'
import { ReminderPayload } from '@/app/actions/reminders'

/** Default event time: noon UTC on the occurrence date */
function atNoon(date: Date): Date {
  return setMinutes(setHours(startOfDay(date), 12), 0)
}

function nextBirthday(birthdateStr: string): Date {
  const birthdate = parseISO(birthdateStr)
  const today = startOfDay(new Date())
  let candidate = setYear(birthdate, today.getFullYear())
  if (isBefore(candidate, today)) {
    candidate = addYears(candidate, 1)
  }
  return atNoon(candidate)
}

function nextRenewal(renewalDateStr: string, cycle?: string): Date {
  const renewal = parseISO(renewalDateStr)
  const today = startOfDay(new Date())
  let candidate = atNoon(renewal)
  while (isBefore(candidate, today)) {
    if (cycle === 'weekly') candidate = addWeeks(candidate, 1)
    else if (cycle === 'yearly') candidate = addYears(candidate, 1)
    else candidate = addMonths(candidate, 1)
  }
  return candidate
}

function nextHoliday(holidayDateStr: string): Date {
  const date = parseISO(holidayDateStr)
  const today = startOfDay(new Date())
  let candidate = atNoon(date)
  if (isBefore(candidate, today)) {
    candidate = addYears(candidate, 1)
  }
  return candidate
}

/**
 * Computes the initial next_occurrence_at for recurrence_rules.
 * Required for the dispatch cron to pick up reminders.
 */
export function computeInitialNextOccurrence(payload: ReminderPayload): string | null {
  if (payload.category === 'person' && payload.person_details?.birthdate) {
    return nextBirthday(payload.person_details.birthdate).toISOString()
  }

  if (payload.category === 'subscription' && payload.subscription_details?.renewal_date) {
    return nextRenewal(
      payload.subscription_details.renewal_date,
      payload.subscription_details.cycle
    ).toISOString()
  }

  if (payload.category === 'task' && payload.task_details?.due_at) {
    return new Date(payload.task_details.due_at).toISOString()
  }

  if (payload.category === 'custom_holiday' && payload.holiday_details?.holiday_date) {
    return nextHoliday(payload.holiday_details.holiday_date).toISOString()
  }

  return null
}
