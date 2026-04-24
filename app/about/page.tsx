import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — IFS Journal',
}

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <header>
        <h1 className="font-heading text-3xl tracking-tight text-foreground mb-2">
          About IFS Journal
        </h1>
        <p className="text-muted-foreground">
          A journaling tool that helps you notice and understand your "parts."
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">What is IFS?</h2>
        <p>
          Internal Family Systems (IFS) is a therapy framework developed by Richard Schwartz. It
          treats the mind as a system of parts — Managers that plan and control, Firefighters that
          distract from pain, Protectors that guard vulnerability, and Exiles that carry old wounds.
          The goal is not to get rid of parts but to understand and relate to them with curiosity
          and care.
        </p>
        <p>
          IFS Journal is a structured writing space: you write entries, and Claude (an AI model)
          highlights passages that might reflect each part, grounded in the actual text you wrote.
          You can then have conversations with any part to explore it further.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">Important — this is not therapy</h2>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
          <p className="font-semibold mb-1">IFS Journal is not a substitute for therapy.</p>
          <p>
            It is a reflective writing tool, not a clinician. AI-generated analysis can be wrong. If
            you are in crisis, please reach out to a real person — in the US, you can call or text{' '}
            <strong>988</strong> (Suicide and Crisis Lifeline) 24/7. Internationally, see{' '}
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              findahelpline.com
            </a>
            .
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">Privacy in short</h2>
        <p>
          Your entries are stored on our servers and sent to Anthropic's Claude API for analysis. We
          do not train models on your writing, and we do not sell your data. You can export or
          delete everything at any time. Details in the{' '}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">Contact</h2>
        <p>
          Feedback, bugs, or privacy questions:{' '}
          <a href="mailto:hello@ifsjournal.me" className="underline">
            hello@ifsjournal.me
          </a>
          .
        </p>
      </section>
    </main>
  )
}
