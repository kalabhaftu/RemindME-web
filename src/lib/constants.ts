export const RELATIONSHIP_LABELS: Record<string, { label: string; emoji: string }> = {
  family: { label: 'Family', emoji: '👨‍👩‍👧' },
  partner: { label: 'Partner', emoji: '💑' },
  friend: { label: 'Friends', emoji: '👫' },
  colleague: { label: 'Colleague', emoji: '💼' },
  other: { label: 'Other', emoji: '👤' },
}

export const GENDER_LABELS: Record<string, { label: string; color: string }> = {
  male: { label: 'Male', color: 'rgba(52, 211, 153, 0.25)' },
  female: { label: 'Female', color: 'rgba(236, 72, 153, 0.25)' },
  nonbinary: { label: 'Non-binary', color: 'rgba(139, 92, 246, 0.25)' },
  unspecified: { label: '—', color: 'rgba(255,255,255,0.06)' },
}

export const ZODIAC_META: Record<string, { glyph: string; color: string }> = {
  Aries: { glyph: '♈', color: 'rgba(239, 68, 68, 0.25)' },
  Taurus: { glyph: '♉', color: 'rgba(34, 197, 94, 0.25)' },
  Gemini: { glyph: '♊', color: 'rgba(234, 179, 8, 0.25)' },
  Cancer: { glyph: '♋', color: 'rgba(59, 130, 246, 0.25)' },
  Leo: { glyph: '♌', color: 'rgba(249, 115, 22, 0.25)' },
  Virgo: { glyph: '♍', color: 'rgba(132, 204, 22, 0.25)' },
  Libra: { glyph: '♎', color: 'rgba(168, 85, 247, 0.25)' },
  Scorpio: { glyph: '♏', color: 'rgba(126, 34, 206, 0.25)' },
  Sagittarius: { glyph: '♐', color: 'rgba(180, 83, 9, 0.25)' },
  Capricorn: { glyph: '♑', color: 'rgba(107, 114, 128, 0.25)' },
  Aquarius: { glyph: '♒', color: 'rgba(14, 165, 233, 0.25)' },
  Pisces: { glyph: '♓', color: 'rgba(96, 165, 250, 0.25)' },
}

export const LEAD_TIME_OPTIONS = [
  { value: 'at_time', label: 'At time of event' },
  { value: 'morning_of', label: 'Morning of' },
  { value: 'noon_of', label: 'Noon of' },
  { value: 'evening_of', label: 'Evening of' },
  { value: 'custom', label: 'Custom time' },
] as const

export const CHANNELS = ['email', 'push', 'telegram', 'in_app'] as const

export type SortOption = 'days_asc' | 'name_asc' | 'age_desc' | 'relationship' | 'recent'
