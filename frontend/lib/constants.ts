// Part role colors based on design system
export const PART_COLORS = {
  Protector: '#ef4444', // Red
  Manager: '#f59e0b', // Amber
  Firefighter: '#f97316', // Orange
  Exile: '#8b5cf6', // Purple
} as const

// Part role descriptions
export const PART_DESCRIPTIONS = {
  Protector: 'Guards against emotional pain and vulnerability',
  Manager: 'Maintains control and prevents chaos',
  Firefighter: 'Provides immediate relief from overwhelming feelings',
  Exile: 'Carries wounded feelings and memories',
} as const

// App configuration
export const APP_CONFIG = {
  maxParts: 10,
  maxPromptLength: 100,
  maxResponseLength: 150,
  writingTipsDebounceMs: 3000,
  undoExpirationHours: 24,
  recentEntriesContext: 15,
} as const
