'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppNav } from '@/components/AppNav'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DemoToast } from '@/components/ui/DemoToast'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

// Fallback prompts used before the API has returned and when generation fails.
// Kept deliberately plain — the goal is to surface the kind of material that
// IFS work leans on (internal disagreement, action-value gaps, self-directed
// harshness) without sounding like therapy homework.
const prompts = [
  "What's something that's sitting with you today?",
  'Was there a moment this week where you felt pulled in two directions? Walk me through both sides.',
  "What's something you agreed to this week that you later wished you hadn't?",
  'Describe a moment from this week when your reaction felt bigger or smaller than the situation called for.',
  "What did you say to yourself the last time something didn't go the way you wanted?",
]

export default function JournalPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDemoToast, setShowDemoToast] = useState(false)
  const { setAnalyzing } = useAnalysisStore()
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showWritingTips, setShowWritingTips] = useState(false)
  const [writingTip, setWritingTip] = useState<string | null>(null)
  const [loadingTip, setLoadingTip] = useState(false)
  // Ring buffer of the last couple of tips shown for this draft session. Kept
  // in a ref so pushing doesn't retrigger the debounced fetch effect.
  const recentTipsRef = useRef<string[]>([])
  const wordCount = (content + interimTranscript).trim().split(/\s+/).filter(Boolean).length
  const isDemo = session?.user?.isDemo

  // Initialize speech recognition
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    ) {
      // Web Speech API isn't in @types/react-dom's lib yet; reach for it via
      // a narrow unknown cast rather than any.
      const win = window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognition
        SpeechRecognition?: new () => SpeechRecognition
      }
      const SpeechRecognitionAPI = win.webkitSpeechRecognition || win.SpeechRecognition
      if (!SpeechRecognitionAPI) return
      const recognitionInstance = new SpeechRecognitionAPI()
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += `${transcript} `
          } else {
            interim += transcript
          }
        }

        if (final) {
          setContent((prev) => {
            // Capitalize first letter if this is the start of content or after sentence-ending punctuation
            let processedText = final.trim()

            if (prev.trim().length === 0) {
              // First sentence - capitalize first letter
              processedText = processedText.charAt(0).toUpperCase() + processedText.slice(1)
            } else {
              // Check if previous content ends with sentence-ending punctuation
              const lastChar = prev.trim().slice(-1)
              if (['.', '!', '?'].includes(lastChar)) {
                processedText = processedText.charAt(0).toUpperCase() + processedText.slice(1)
              }
            }

            // Add appropriate punctuation at the end if it doesn't have any
            const lastCharOfNew = processedText.slice(-1)
            if (!['.', '!', '?', ','].includes(lastCharOfNew)) {
              // Detect if it's a question based on question words
              const questionWords = [
                'who',
                'what',
                'when',
                'where',
                'why',
                'how',
                'is',
                'are',
                'do',
                'does',
                'did',
                'can',
                'could',
                'would',
                'should',
                'will',
                'have',
                'has',
              ]
              const firstWord = processedText.toLowerCase().split(' ')[0]

              if (questionWords.includes(firstWord)) {
                processedText += '?'
              } else {
                processedText += '.'
              }
            }

            return prev + (prev.trim().length > 0 ? ' ' : '') + processedText
          })
          setInterimTranscript('')
        } else {
          setInterimTranscript(interim)
        }
      }

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied')
        }
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
      }

      setRecognition(recognitionInstance)
    }
  }, [])

  const toggleListening = () => {
    if (!recognition) {
      toast.error('Speech recognition not supported')
      return
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
      setInterimTranscript('')
    } else {
      try {
        recognition.start()
        setIsListening(true)
      } catch {
        toast.error('Failed to start voice input')
      }
    }
  }

  // Handle escape key to stop speech recognition
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isListening && recognition) {
        recognition.stop()
        setIsListening(false)
        setInterimTranscript('')
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isListening, recognition])

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content) {
        localStorage.setItem('journal-draft', content)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [content])

  // Load draft and prompt on mount
  useEffect(() => {
    const draft = localStorage.getItem('journal-draft')
    if (draft) {
      setContent(draft)
    }

    const savedPrompt = localStorage.getItem('journal-prompt')
    if (savedPrompt) {
      setPrompt(savedPrompt)
    } else {
      setPrompt(prompts[0])
    }

    const tipsEnabled = localStorage.getItem('writing-tips-enabled')
    if (tipsEnabled === 'true') {
      setShowWritingTips(true)
    }

    setIsInitialized(true)
  }, [])

  // Auto-save prompt to localStorage (only after initialization)
  useEffect(() => {
    if (isInitialized && prompt) {
      localStorage.setItem('journal-prompt', prompt)
    }
  }, [prompt, isInitialized])

  // Generate writing tips when content changes
  useEffect(() => {
    if (!showWritingTips || !content || content.trim().length < 50) {
      return
    }

    const timer = setTimeout(async () => {
      setLoadingTip(true)
      try {
        const response = await fetch('/api/prompts/writing-tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            content,
            recentTips: recentTipsRef.current,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const tip = data.tip as string
          setWritingTip(tip)
          if (tip) {
            recentTipsRef.current = [...recentTipsRef.current, tip].slice(-2)
          }
        }
      } catch (error) {
        console.error('Failed to generate writing tip:', error)
      } finally {
        setLoadingTip(false)
      }
    }, 3000) // Wait 3 seconds after user stops typing

    return () => clearTimeout(timer)
  }, [content, prompt, showWritingTips])

  const toggleWritingTips = () => {
    const newValue = !showWritingTips
    setShowWritingTips(newValue)
    localStorage.setItem('writing-tips-enabled', String(newValue))
    if (!newValue) {
      setWritingTip(null)
    }
  }

  const handleNewPrompt = () => {
    if (content.trim()) {
      setShowConfirm(true)
    } else {
      generateNewPrompt()
    }
  }

  const generateNewPrompt = async () => {
    setShowConfirm(false)
    setLoadingPrompt(true)
    // Fresh prompt = fresh draft context. Let the tips engine pick any mode
    // again on the next tip.
    recentTipsRef.current = []
    setWritingTip(null)
    try {
      const response = await fetch('/api/prompts/generate', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.prompt) {
        setPrompt(data.prompt)
        setContent('')
        localStorage.removeItem('journal-draft')
        localStorage.setItem('journal-prompt', data.prompt)
      } else if (data.fallback) {
        setPrompt(data.fallback)
        setContent('')
        localStorage.removeItem('journal-draft')
        localStorage.setItem('journal-prompt', data.fallback)
      }
    } catch {
      const currentIndex = prompts.indexOf(prompt)
      const nextIndex = (currentIndex + 1) % prompts.length
      const newPrompt = prompts[nextIndex]
      setPrompt(newPrompt)
      setContent('')
      localStorage.removeItem('journal-draft')
      localStorage.setItem('journal-prompt', newPrompt)
    } finally {
      setLoadingPrompt(false)
    }
  }

  const handleSave = async () => {
    if (isDemo) {
      setShowDemoToast(true)
      return
    }

    if (!content.trim()) {
      toast.error('Please write something first')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/journal/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          content,
          wordCount,
        }),
      })

      if (response.status === 403) {
        const errorData = await response.json()
        toast.error(errorData.error || 'Demo users cannot save entries')
        setSaving(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const data = await response.json()
      const entryId = data.entry.id

      toast.success('Entry saved successfully!')
      setContent('')
      localStorage.removeItem('journal-draft')

      // Analysis is triggered automatically in the background by the API
      setAnalyzing(true, 'incremental')

      // Poll for analysis completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/journal/entries/${entryId}`)
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            if (
              statusData.entry.analysisStatus === 'completed' ||
              statusData.entry.analysisStatus === 'failed'
            ) {
              setAnalyzing(false)
              clearInterval(pollInterval)

              // Invalidate all queries that depend on analysis results
              queryClient.invalidateQueries({ queryKey: ['parts'] })
              queryClient.invalidateQueries({ queryKey: ['part'] })
              queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
              queryClient.invalidateQueries({ queryKey: ['journal-entry'] })
            }
          }
        } catch (error) {
          console.error('Failed to check analysis status:', error)
        }
      }, 2000)

      // Fallback: clear after 30 seconds max
      setTimeout(() => {
        setAnalyzing(false)
        clearInterval(pollInterval)

        // Invalidate queries even on timeout
        queryClient.invalidateQueries({ queryKey: ['parts'] })
        queryClient.invalidateQueries({ queryKey: ['part'] })
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
        queryClient.invalidateQueries({ queryKey: ['journal-entry'] })
      }, 30000)
    } catch {
      toast.error('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const progressFillClass =
    wordCount < 100 ? 'bg-destructive/70' : wordCount < 250 ? 'bg-muted-foreground' : 'bg-primary'

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 py-10 md:py-14 pb-24 md:pb-14">
        <div className="max-w-[720px] mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-3xl tracking-tight text-foreground">Journal</h2>
            <button
              type="button"
              onClick={handleNewPrompt}
              disabled={loadingPrompt}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {loadingPrompt ? 'Generating…' : 'New prompt'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-muted border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1.5">
                    Today&apos;s prompt
                  </p>
                  <p className="text-foreground font-serif text-lg leading-snug">
                    {prompt || 'Loading…'}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={content + interimTranscript}
                onChange={(e) => {
                  const newValue = e.target.value
                  // Remove interim transcript from the end if present
                  if (interimTranscript && newValue.endsWith(interimTranscript)) {
                    setContent(newValue.slice(0, -interimTranscript.length))
                  } else {
                    setContent(newValue)
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                placeholder="Start writing your thoughts…"
                // Short on mobile so the save button and word-count bar stay
                // above the keyboard; full height on tablet+.
                rows={6}
                className="font-serif text-base w-full px-4 py-3 bg-card border border-input rounded-xl focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none md:min-h-[320px]"
              />
            </div>

            {/* Writing tips display - below text window, above controls */}
            {showWritingTips && (
              <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                {loadingTip ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
                  </div>
                ) : writingTip ? (
                  <p className="text-sm text-foreground leading-relaxed">{writingTip}</p>
                ) : content.trim().length < 50 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Start writing to receive personalized tips…
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Keep writing to receive tips…
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Progress Bar Container */}
              <div className="flex-1 relative h-10 bg-muted rounded-lg overflow-hidden">
                {/* Progress Fill */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-300 ease-out ${progressFillClass}`}
                  style={{ width: `${Math.min((wordCount / 750) * 100, 100)}%` }}
                />
                {/* Word Count Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-between px-4">
                  <span className="text-sm font-medium text-foreground relative z-10">
                    {wordCount} words
                  </span>
                  <span className="text-xs text-muted-foreground relative z-10">750</span>
                </div>
              </div>

              {/* Voice Input Button */}
              {recognition && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`h-10 w-10 rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center ${
                    isListening
                      ? 'bg-destructive/15 text-destructive hover:bg-destructive/20'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  {isListening ? (
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5 animate-pulse"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )}

              {/* Writing Tips Toggle */}
              <button
                type="button"
                onClick={toggleWritingTips}
                className={`h-10 w-10 rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center ${
                  showWritingTips
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
                title={showWritingTips ? 'Hide writing tips' : 'Show writing tips'}
              >
                <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
              </button>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`h-10 px-6 rounded-lg font-medium transition flex items-center gap-2 shrink-0 ${
                  isDemo
                    ? 'bg-muted text-muted-foreground cursor-pointer'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                title={isDemo ? 'Demo users cannot save entries' : ''}
              >
                {saving ? 'Saving…' : 'Save entry'}
                {!saving && !isDemo && <span className="text-xs opacity-75">⌘↵</span>}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showDemoToast && <DemoToast onClose={() => setShowDemoToast(false)} />}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={generateNewPrompt}
        title="Clear current text?"
        message="Getting a new prompt will clear your current text. Are you sure you want to continue?"
        confirmText="Continue"
        isLoading={loadingPrompt}
      />
    </div>
  )
}
