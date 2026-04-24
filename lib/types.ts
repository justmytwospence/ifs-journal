// Core type definitions for the IFS Journal App

export type PartRole = 'Protector' | 'Manager' | 'Firefighter' | 'Exile'
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type MessageRole = 'user' | 'part'
export type OperationType = 'delete'

export interface User {
  id: string
  email: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface JournalEntry {
  id: string
  userId: string
  prompt: string
  content: string
  wordCount: number
  analysisStatus: AnalysisStatus
  createdAt: Date
  updatedAt: Date
}

export interface Part {
  id: string
  userId: string
  name: string
  description: string
  role: PartRole
  color: string
  icon?: string
  slug?: string
  createdAt: Date
  updatedAt: Date
}

export interface Highlight {
  id: string
  entryId: string
  partAnalysisId: string
  startOffset: number
  endOffset: number
  exact: string
  prefix: string
  suffix: string
  reasoning: string | null
  isStale: boolean
  createdAt: Date
}

export interface PartAnalysis {
  id: string
  entryId: string
  partId: string
  highlights: Highlight[]
  confidence: number
  createdAt: Date
}

export interface PartConversation {
  id: string
  userId: string
  partId: string
  createdAt: Date
  updatedAt: Date
}

export interface ConversationMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  timestamp: Date
}

export interface PartsOperation {
  id: string
  userId: string
  operationType: OperationType
  snapshotBefore: DeletedPartSnapshot
  createdAt: Date
  expiresAt: Date
  undone: boolean
}

export interface DeletedPartSnapshot {
  part: Part
  partAnalyses: PartAnalysis[]
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
}

export interface ResetPasswordFormData {
  email: string
}
