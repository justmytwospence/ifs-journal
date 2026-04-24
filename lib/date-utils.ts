export function formatEntryDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long' })
    }
    
    return formatFullEntryDate(dateString)
}

export function formatFullEntryDate(dateString: string): string {
    const date = new Date(dateString)
    // Format as "Sunday October 26, 2025" (no comma after weekday)
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
    const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    return `${weekday} ${monthDay}`
}
