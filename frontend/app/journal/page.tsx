'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AppNav } from '@/components/AppNav'
import { Toast } from '@/components/ui/Toast'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

const prompts = [
  'What emotions are you experiencing right now, and which part of you might be feeling them?',
  'Describe a moment today when you noticed different parts of yourself in conflict.',
  'What does your inner critic say to you most often?',
  'When do you feel most at peace with yourself?',
  'Reflect on a time when you felt the need to protect yourself emotionally.',
]

export default function JournalPage() {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { setAnalyzing } = useAnalysisStore()
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const wordCount = (content + interimTranscript).trim().split(/\s+/).filter(Boolean).length

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'

      recognitionInstance.onresult = (event: any) => {
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
          setContent((prev) => prev + final)
          setInterimTranscript('')
        } else {
          setInterimTranscript(interim)
        }
      }

      recognitionInstance.onerror = (event: any) => {
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
      recognition.start()
      setIsListening(true)
    }
  }

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

    setIsInitialized(true)
  }, [])

  // Auto-save prompt to localStorage (only after initialization)
  useEffect(() => {
    if (isInitialized && prompt) {
      localStorage.setItem('journal-prompt', prompt)
    }
  }, [prompt, isInitialized])

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
    } catch (error) {
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
    } catch (error) {
      setToast({ message: 'Failed to save entry', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Journal</h2>
            <p className="text-gray-600">Write about your thoughts and feelings</p>
          </div>
          <button
            onClick={handleNewPrompt}
            disabled={loadingPrompt}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {loadingPrompt ? 'Generating...' : 'New Prompt'}
          </button>
        </div>

        <div>
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">Today&apos;s Prompt</p>
                    <p className="text-blue-700 font-bold">{prompt || 'Loading...'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
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

              <div className="flex items-center gap-3">
                {/* Progress Bar Container */}
                <div className="flex-1 relative h-10 bg-gray-200 rounded-lg overflow-hidden">
                  {/* Progress Fill */}
                  <div 
                    className={`absolute inset-y-0 left-0 transition-all duration-300 ease-out ${
                      wordCount < 100 
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

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shrink-0"
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                  {!saving && (
                    <span className="text-xs opacity-75">⌘↵</span>
                  )}
                </button>
              </div>
            </div>
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

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Clear current text?</h3>
            <p className="text-gray-600 mb-6">
              Getting a new prompt will clear your current text. Are you sure you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={generateNewPrompt}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
