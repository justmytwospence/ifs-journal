import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

const features = [
  {
    emoji: '✍️',
    title: 'Guided prompts',
    body: 'Personalized journal prompts that help you explore your internal parts.',
  },
  {
    emoji: '🎭',
    title: 'Parts discovery',
    body: 'Identify your Protectors, Managers, Firefighters, and Exiles as you write.',
  },
  {
    emoji: '💬',
    title: 'Part conversations',
    body: 'Open a dialogue with a part and listen to what it has to say.',
  },
]

export default async function Home() {
  const session = await auth()

  // If user is logged in, redirect based on today's entry
  if (session?.user?.id) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayEntry = await prisma.journalEntry.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null,
        createdAt: {
          gte: today,
        },
      },
    })

    if (todayEntry) {
      redirect('/log')
    } else {
      redirect('/journal')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center space-y-6 mb-14">
            <h1 className="font-heading text-5xl md:text-6xl tracking-tight text-foreground">
              IFS Journal
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Discover and understand your internal parts through guided journaling.
            </p>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Based on Internal Family Systems therapy principles.
            </p>
            <p className="text-xs text-muted-foreground max-w-xl mx-auto pt-2">
              IFS Journal is a journaling tool, not a substitute for therapy or medical advice. In
              crisis? In the US, call or text <strong>988</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20">
            <Button size="lg" render={<Link href="/register" />}>
              Get started
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button size="lg" variant="ghost" render={<Link href="/demo" />}>
              Try the demo
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <div className="size-12 rounded-xl bg-muted grid place-items-center mb-2">
                    <span aria-hidden="true" className="text-2xl">
                      {f.emoji}
                    </span>
                  </div>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{f.body}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
