export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo/Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-semibold text-text-primary tracking-tight">
              IFS Journal
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto">
              Discover and understand your internal parts through guided journaling
            </p>
          </div>

          {/* Description */}
          <p className="text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            Based on Internal Family Systems (IFS) therapy principles, this app helps you explore 
            your inner world with AI-powered prompts and parts discovery.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <button className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors duration-200 shadow-sm">
              Get Started
            </button>
            <button className="px-8 py-3 border-2 border-border text-text-primary rounded-lg font-medium hover:border-primary hover:text-primary transition-colors duration-200">
              Learn More
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <div className="p-6 bg-surface rounded-xl border border-border space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✍️</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                AI-Powered Prompts
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Receive personalized journal prompts that help you explore your internal parts naturally
              </p>
            </div>

            <div className="p-6 bg-surface rounded-xl border border-border space-y-3">
              <div className="w-12 h-12 bg-part-protector/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎭</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                Parts Discovery
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Automatically identify and understand your Protectors, Managers, Firefighters, and Exiles
              </p>
            </div>

            <div className="p-6 bg-surface rounded-xl border border-border space-y-3">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                Part Conversations
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Engage in therapeutic dialogues with your parts to understand their needs and concerns
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-secondary">
          <p>Built with Next.js, TypeScript, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  )
}
