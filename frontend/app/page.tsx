export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center space-y-6 mb-16">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              IFS Journal
            </h1>
            <p className="text-2xl text-gray-600 max-w-2xl mx-auto">
              Discover and understand your internal parts through guided journaling
            </p>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Based on Internal Family Systems therapy principles
            </p>
          </div>

          {/* CTA */}
          <div className="flex gap-4 justify-center mb-20">
            <a
              href="/register"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started
            </a>
            <a
              href="/login"
              className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all border-2 border-gray-200"
            >
              Sign In
            </a>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">✍️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Prompts</h3>
              <p className="text-gray-600">
                Personalized journal prompts that help you explore your internal parts
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🎭</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Parts Discovery</h3>
              <p className="text-gray-600">
                Automatically identify your Protectors, Managers, Firefighters, and Exiles
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Part Conversations</h3>
              <p className="text-gray-600">
                Engage in therapeutic dialogues with your parts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
