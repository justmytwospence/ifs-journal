import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      isDemo?: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    emailVerified: boolean
    isDemo?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    email?: string
    isDemo?: boolean
  }
}
