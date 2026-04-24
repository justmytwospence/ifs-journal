import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import prisma from '@/lib/db'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  isDemo: z.union([z.boolean(), z.string()]).optional().transform(val => val === true || val === 'true'),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        isDemo: { label: 'Is Demo', type: 'text' },
      },
      authorize: async (credentials) => {
        try {
          const { email, password, isDemo } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            return null
          }

          const isValidPassword = await compare(password, user.passwordHash)

          if (!isValidPassword) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            isDemo: isDemo || false,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        // Only mark as demo if explicitly passed during login
        token.isDemo = user.isDemo || false
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.isDemo = token.isDemo || false
      }
      return session
    },
  },
})
