import { useQuery } from '@tanstack/react-query'

interface Part {
  id: string
  name: string
  role: string
  color: string
  description: string
  appearances: number
}

export function useParts() {
  return useQuery({
    queryKey: ['parts'],
    queryFn: async () => {
      const response = await fetch('/api/parts')
      if (!response.ok) throw new Error('Failed to fetch parts')
      const data = await response.json()
      return data.parts as Part[]
    },
  })
}

export function usePart(id: string) {
  return useQuery({
    queryKey: ['part', id],
    queryFn: async () => {
      const response = await fetch(`/api/parts/${id}`)
      if (!response.ok) throw new Error('Failed to fetch part')
      const data = await response.json()
      return data.part as Part
    },
    enabled: !!id,
  })
}
