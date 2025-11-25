'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { AppNav } from '@/components/AppNav'
import { Toast } from '@/components/ui/Toast'
import { DemoToast } from '@/components/ui/DemoToast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
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

const prompts = [
  'What emotions are you experiencing right now, and which part of you might be feeling them?',
  'Describe a moment today when you noticed different parts of yourself in conflict.',
  'What does your inner critic say to you most often?',
  'When do you feel most at peace with yourself?',
  'Reflect on a time when you felt the need to protect yourself emotionally.',
]

export default function JournalPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showDemoToast, setShowDemoToast] = useState(false)
  const { setAnalyzing } = useAnalysisStore()
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showWritingTips, setShowWritingTips] = useState(false)
  const [writingTip, setWritingTip] = useState<string | null>(null)
  const [loadingTip, setLoadingTip] = useState(false)
  const wordCount = (content + interimTranscript).trim().split(/\s+/).filter(Boolean).length
  const isDemo = session?.user?.isDemo

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognitionInstance = new SpeechRecognitionAPI() as SpeechRecognition
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript + ' '
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
              const questionWords = ['who', 'what', 'when', 'where', 'why', 'how', 'is', 'are', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'have', 'has']
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
          setToast({ message: 'Microphone access denied', type: 'error' })
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
      setToast({ message: 'Speech recognition not supported', type: 'error' })
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
        setToast({ message: 'Failed to start voice input', type: 'error' })
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
          body: JSON.stringify({ prompt, content }),
        })

        if (response.ok) {
          const data = await response.json()
          setWritingTip(data.tip)
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
      setToast({ message: 'Please write something first', type: 'error' })
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
        setToast({ message: errorData.error || 'Demo users cannot save entries', type: 'error' })
        setSaving(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const data = await response.json()
      const entryId = data.entry.id

      setToast({ message: 'Entry saved successfully!', type: 'success' })
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
            if (statusData.entry.analysisStatus === 'completed' || statusData.entry.analysisStatus === 'failed') {
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
      setToast({ message: 'Failed to save entry', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold">Journal</h2>
          <button
            onClick={handleNewPrompt}
            disabled={loadingPrompt}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {loadingPrompt ? 'Generating...' : 'New Prompt'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">Today&apos;s Prompt</p>
                <p className="text-blue-700 font-bold">{prompt || 'Loading...'}</p>
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
                  placeholder="Start writing your thoughts..."
                  rows={12}
                  className="font-serif w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Writing tips display - below text window, above controls */}
              {showWritingTips && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl px-4 py-3">
                  {loadingTip ? (
                    <div className="space-y-2">
                      <div className="h-3 bg-purple-200 rounded animate-pulse" />
                      <div className="h-3 bg-purple-200 rounded animate-pulse w-5/6" />
                    </div>
                  ) : writingTip ? (
                    <p className="text-sm text-gray-700 leading-relaxed">{writingTip}</p>
                  ) : content.trim().length < 50 ? (
                    <p className="text-sm text-gray-500 italic">
                      Start writing to receive personalized tips...
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Keep writing to receive tips...
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Progress Bar Container */}
                <div className="flex-1 relative h-10 bg-gray-200 rounded-lg overflow-hidden">
                  {/* Progress Fill */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-300 ease-out ${wordCount < 100
                      ? 'bg-red-500'
                      : wordCount < 250
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                      }`}
                    style={{ width: `${Math.min((wordCount / 750) * 100, 100)}%` }}
                  />
                  {/* Word Count Text Overlay */}
                  <div className="absolute inset-0 flex items-center justify-between px-4">
                    <span className="text-sm font-medium text-gray-700 relative z-10">
                      {wordCount} words
                    </span>
                    <span className="text-xs text-gray-500 relative z-10">750</span>
                  </div>
                </div>

                {/* Voice Input Button */}
                {recognition && (
                  <button
                    onClick={toggleListening}
                    className={`h-10 w-10 rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center ${isListening
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    {isListening ? (
                      <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Writing Tips Toggle */}
                <button
                  onClick={toggleWritingTips}
                  className={`h-10 w-10 rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center ${showWritingTips
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  title={showWritingTips ? 'Hide writing tips' : 'Show writing tips'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`h-10 px-6 rounded-lg font-medium transition shadow-sm flex items-center gap-2 shrink-0 ${isDemo
                    ? 'bg-gray-400 text-white opacity-50 cursor-pointer'
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  title={isDemo ? 'Demo users cannot save entries' : ''}
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                  {!saving && !isDemo && (
                    <span className="text-xs opacity-75">⌘↵</span>
                  )}
                </button>
              </div>
            </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showDemoToast && (
        <DemoToast onClose={() => setShowDemoToast(false)} />
      )}

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
