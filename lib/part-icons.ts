// Simple unicode symbols for parts - each part gets a unique one
export const AVAILABLE_ICONS = [
  '●', '■', '▲', '◆', '★', '▼', '◀', '▶',
  '◉', '◎', '○', '□', '△', '◇', '☆', '▽',
  '◁', '▷', '◈', '◐', '◑', '◒', '◓', '◔',
]

// Get a random icon from the available set
export function getRandomIcon(existingIcons: string[] = []): string {
  const availableIcons = AVAILABLE_ICONS.filter(icon => !existingIcons.includes(icon))
  if (availableIcons.length === 0) {
    // If all icons are used, start reusing them
    return AVAILABLE_ICONS[Math.floor(Math.random() * AVAILABLE_ICONS.length)]
  }
  return availableIcons[Math.floor(Math.random() * availableIcons.length)]
}

// For displaying parts - use the icon stored in the database
export function getPartIcon(icon?: string): string {
  return icon || '●'
}
