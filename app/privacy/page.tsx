import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — IFS Journal',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: April 24, 2026</p>

      <div className="prose prose-neutral max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-2">What we collect</h2>
          <p>
            To run your account we store your email address, a salted/hashed password, and the
            journal entries, parts, conversations, and highlights you create. We also record the
            date an account was created and minimal usage metadata (rate-limit counters and error
            reports).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">How your entries are processed</h2>
          <p>
            When you save a journal entry, its text is sent to Anthropic's Claude API, which
            processes the content to identify and cite "parts" and to generate responses in part
            conversations. Anthropic processes this data as our subprocessor under their API terms.
            We do not sell your data or share it with other third parties. We do not train any
            models on your content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Security</h2>
          <p>
            Data is stored in a managed Postgres database (Neon) in the United States. Passwords are
            hashed with bcrypt. The application runs on Vercel and is served over HTTPS.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Your rights</h2>
          <p>
            You can export everything we have about you at any time from the Profile page ("Export
            My Data"). You can delete your account from the same page, which permanently removes
            your entries, parts, conversations, and highlights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Retention</h2>
          <p>
            Data is retained as long as your account exists. If you delete your account, your data
            is removed immediately from the primary database. Managed database backups may retain
            copies for up to 30 days before aging out.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Cookies</h2>
          <p>
            We use a single session cookie for authentication. We do not set advertising or
            analytics cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Children</h2>
          <p>IFS Journal is not intended for use by anyone under 16.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p>
            Questions about this policy or your data: reach out via the contact email shown on the
            About page.
          </p>
        </section>
      </div>
    </main>
  )
}
