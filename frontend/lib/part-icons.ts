// Map part roles to relevant unicode symbols
export function getPartIcon(role: string): string {
  const iconMap: Record<string, string> = {
    'Protector': '🛡️',
    'Manager': '📋',
    'Firefighter': '🚒',
    'Exile': '💔',
  }
  
  return iconMap[role] || '✨'
}
