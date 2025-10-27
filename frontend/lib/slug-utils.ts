export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

export function createPartSlug(partName: string, partId: string): string {
  // Include ID at the end to ensure uniqueness: "the-critic-abc123"
  return `${slugify(partName)}-${partId.slice(-6)}`
}

export function extractPartIdFromSlug(slug: string): string | null {
  // Extract the last 6 characters (the ID suffix)
  const parts = slug.split('-')
  if (parts.length === 0) return null
  return parts[parts.length - 1]
}

export function createEntrySlug(createdAt: string | Date, entryId?: string): string {
  // Create a slug from the date using UTC to ensure consistency: "2024-01-15-monday-3-45pm"
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase()
  
  let hours = date.getUTCHours()
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  
  // Include seconds to make it more unique
  return `${year}-${month}-${day}-${weekday}-${hours}-${minutes}-${seconds}${ampm}`
}
