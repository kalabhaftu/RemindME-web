import { differenceInYears, differenceInDays, setYear, isBefore, startOfDay, parseISO } from 'date-fns'

export function getZodiacSign(dateString: string): string {
  const d = parseISO(dateString)
  const month = d.getMonth() + 1
  const day = d.getDate()
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini'
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius'
  return 'Pisces'
}

export function getAge(birthdateStr: string): number {
  return differenceInYears(new Date(), parseISO(birthdateStr))
}

export function getDaysUntilBirthday(birthdateStr: string): number {
  const today = startOfDay(new Date())
  const birthdate = parseISO(birthdateStr)
  
  // Create this year's birthday
  let nextBday = setYear(birthdate, today.getFullYear())
  
  // If it already passed this year, it's next year
  if (isBefore(nextBday, today)) {
    nextBday = setYear(nextBday, today.getFullYear() + 1)
  }
  
  return differenceInDays(nextBday, today)
}
