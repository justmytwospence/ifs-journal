import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Test connection first
  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    throw error
  }

  // Hash password for test users
  const passwordHash = await bcrypt.hash('password123', 12)

  // Create test users
  console.log('Creating test users...')
  
  // Delete existing users first
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['test@example.com', 'empty@example.com']
      }
    }
  })
  
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash,
      emailVerified: true,
    },
  })

  const emptyUser = await prisma.user.create({
    data: {
      email: 'empty@example.com',
      passwordHash,
      emailVerified: true,
    },
  })

  console.log(`✅ Created users: ${testUser.email}, ${emptyUser.email}`)

  // Create journal entries for test user
  console.log('Creating journal entries...')
  
  const now = new Date()
  const journalEntries = []

  // Create 10 entries spanning 2 weeks
  for (let i = 0; i < 10; i++) {
    const daysAgo = 14 - i
    const entryDate = new Date(now)
    entryDate.setDate(entryDate.getDate() - daysAgo)

    const entry = await prisma.journalEntry.create({
      data: {
        userId: testUser.id,
        prompt: getPrompt(i),
        content: getContent(i),
        wordCount: getContent(i).split(' ').length,
        analysisStatus: i < 7 ? 'completed' : 'pending',
        createdAt: entryDate,
        updatedAt: entryDate,
      },
    })
    journalEntries.push(entry)
  }

  console.log(`✅ Created ${journalEntries.length} journal entries`)

  // Create parts (one of each type)
  console.log('Creating parts...')
  
  const protector = await prisma.part.create({
    data: {
      userId: testUser.id,
      name: 'The Guardian',
      description: 'A protective part that keeps me safe from emotional pain by staying busy and avoiding difficult feelings.',
      role: 'Protector',
      color: '#ef4444',
      quotes: [
        "I don't have time to feel sad, there's too much to do.",
        "If I stop moving, the feelings will catch up with me.",
        "I need to stay strong for everyone else.",
      ],
    },
  })

  const manager = await prisma.part.create({
    data: {
      userId: testUser.id,
      name: 'The Perfectionist',
      description: 'A manager part that tries to control everything to prevent failure and criticism.',
      role: 'Manager',
      color: '#f59e0b',
      quotes: [
        "Everything needs to be perfect or people will judge me.",
        "I can't let anyone see my mistakes.",
        "If I plan everything carefully, nothing bad will happen.",
      ],
    },
  })

  const firefighter = await prisma.part.create({
    data: {
      userId: testUser.id,
      name: 'The Escape Artist',
      description: 'A firefighter part that uses distraction and numbing to escape overwhelming emotions.',
      role: 'Firefighter',
      color: '#f97316',
      quotes: [
        "I just need to scroll through my phone and forget about this.",
        "Maybe if I watch another episode, I won't feel so anxious.",
        "I deserve to zone out after such a hard day.",
      ],
    },
  })

  const exile = await prisma.part.create({
    data: {
      userId: testUser.id,
      name: 'The Lonely Child',
      description: 'An exiled part that carries feelings of loneliness and unworthiness from childhood.',
      role: 'Exile',
      color: '#8b5cf6',
      quotes: [
        "Nobody really wants to be around me.",
        "I'm not good enough to be loved.",
        "Everyone always leaves eventually.",
      ],
    },
  })

  console.log(`✅ Created 4 parts: ${protector.name}, ${manager.name}, ${firefighter.name}, ${exile.name}`)

  // Create part analyses linking entries to parts
  console.log('Creating part analyses...')
  
  const analyses = []

  // Link first 7 entries (completed) to various parts
  for (let i = 0; i < 7; i++) {
    const entry = journalEntries[i]
    const partsToLink = getPartsForEntry(i, [protector, manager, firefighter, exile])

    for (const part of partsToLink) {
      const analysis = await prisma.partAnalysis.create({
        data: {
          entryId: entry.id,
          partId: part.id,
          highlights: getHighlightsForPart(part.name),
          confidence: 0.75 + Math.random() * 0.2,
        },
      })
      analyses.push(analysis)
    }
  }

  console.log(`✅ Created ${analyses.length} part analyses`)

  // Create a parts operation for delete undo testing
  console.log('Creating parts operation...')
  
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  await prisma.partsOperation.create({
    data: {
      userId: testUser.id,
      operationType: 'delete',
      snapshotBefore: {
        part: {
          id: 'deleted-part-id',
          name: 'The Critic',
          description: 'A deleted part for testing undo functionality',
          role: 'Manager',
          color: '#10b981',
        },
        partAnalyses: [],
      },
      expiresAt,
      undone: false,
    },
  })

  console.log('✅ Created parts operation for undo testing')

  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\nTest accounts:')
  console.log('  📧 test@example.com / password123 (with data)')
  console.log('  📧 empty@example.com / password123 (empty account)')
}

// Helper functions for generating realistic content
function getPrompt(index: number): string {
  const prompts = [
    "Think about a recent situation where you felt overwhelmed. What thoughts came up?",
    "Describe a moment today when you noticed different parts of yourself in conflict.",
    "What does your inner critic say to you most often?",
    "When do you feel most at peace with yourself?",
    "Reflect on a time when you felt the need to protect yourself emotionally.",
    "What would you say to your younger self if you could?",
    "Describe a pattern you notice in how you respond to stress.",
    "What are you avoiding thinking about right now?",
    "When do you feel most authentic and true to yourself?",
    "What does self-compassion mean to you?",
  ]
  return prompts[index % prompts.length]
}

function getContent(index: number): string {
  const contents = [
    "Today was really overwhelming. I had so much to do and I just kept pushing through. I don't have time to feel sad, there's too much to do. But underneath, I can feel something heavy waiting for me. I'm scared to slow down because I know the feelings will catch up with me.",
    "I noticed myself being really hard on myself today. Everything needs to be perfect or people will judge me. I spent an hour rewriting an email because I was worried about how it would come across. I can't let anyone see my mistakes. It's exhausting.",
    "After a stressful day, I just wanted to escape. I found myself scrolling through my phone for hours. I just need to scroll through my phone and forget about this. Maybe if I watch another episode, I won't feel so anxious. But it doesn't really help.",
    "I felt really lonely today, even though I was around people. Nobody really wants to be around me. That's what it feels like anyway. I know it's not rational, but the feeling is so strong. I'm not good enough to be loved.",
    "I'm trying to be more aware of my patterns. When I get stressed, I immediately go into planning mode. If I plan everything carefully, nothing bad will happen. But I'm starting to see that this is just another way of trying to control everything.",
    "I had a moment of peace this morning. Just sitting with my coffee, not doing anything. It felt strange at first, like I should be productive. But then I just let myself be. It was nice.",
    "I keep avoiding thinking about that conversation I need to have. I need to stay strong for everyone else. But what about me? When do I get to not be strong?",
    "I noticed the lonely feeling again today. Everyone always leaves eventually. I wonder where that belief came from. It feels so old, like it's been with me forever.",
    "Today I tried to be kind to myself when I made a mistake. It was hard. My first instinct was to beat myself up. But I paused and asked what I would say to a friend. That helped.",
    "I'm starting to see how all these different parts of me are trying to help, even when they make things harder. The part that pushes me to be perfect, the part that wants to escape, the part that feels lonely - they're all trying to protect me in their own way.",
  ]
  return contents[index % contents.length]
}

interface Part {
  id: string
  name: string
}

function getPartsForEntry(index: number, parts: Part[]): Part[] {
  const [protector, manager, firefighter, exile] = parts
  const distributions = [
    [protector, exile],
    [manager],
    [firefighter],
    [exile],
    [manager, protector],
    [protector],
    [manager, exile],
  ]
  return distributions[index % distributions.length]
}

function getHighlightsForPart(partName: string): string[] {
  const highlights: Record<string, string[]> = {
    'The Guardian': [
      "I don't have time to feel sad, there's too much to do.",
      "I need to stay strong for everyone else.",
    ],
    'The Perfectionist': [
      "Everything needs to be perfect or people will judge me.",
      "I can't let anyone see my mistakes.",
    ],
    'The Escape Artist': [
      "I just need to scroll through my phone and forget about this.",
      "Maybe if I watch another episode, I won't feel so anxious.",
    ],
    'The Lonely Child': [
      "Nobody really wants to be around me.",
      "I'm not good enough to be loved.",
      "Everyone always leaves eventually.",
    ],
  }
  return highlights[partName] || []
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
