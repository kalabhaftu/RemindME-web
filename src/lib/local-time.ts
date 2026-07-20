export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'
}

export function formatLocalDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
