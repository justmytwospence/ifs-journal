'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

export interface PartUserFields {
  customName: string | null
  ageImpression: string | null
  positiveIntent: string | null
  fearedOutcome: string | null
  whatItProtects: string | null
  userNotes: string | null
}

interface Props {
  partId: string
  partSlug: string
  initial: PartUserFields
}

type FieldKey = keyof PartUserFields

interface FieldConfig {
  key: FieldKey
  label: string
  helper: string
  multiline?: boolean
  rows?: number
}

const FIELDS: FieldConfig[] = [
  {
    key: 'customName',
    label: 'What do you call it?',
    helper: 'Your own name for this part, if one has come to you.',
  },
  {
    key: 'ageImpression',
    label: 'How old does it feel?',
    helper: "Freeform — 'around 8', 'teenage', 'ancient', 'not sure yet'.",
  },
  {
    key: 'positiveIntent',
    label: "What's it trying to do for you?",
    helper: 'Every part has a positive intent, even when its methods are painful.',
    multiline: true,
    rows: 2,
  },
  {
    key: 'fearedOutcome',
    label: 'What is it afraid would happen if it stopped?',
    helper: 'The fear behind the strategy.',
    multiline: true,
    rows: 2,
  },
  {
    key: 'whatItProtects',
    label: 'What is it protecting?',
    helper: 'Often a more tender part underneath.',
    multiline: true,
    rows: 2,
  },
  {
    key: 'userNotes',
    label: 'Anything else',
    helper: 'Recurring thoughts, resemblances, when it shows up — whatever you want to record.',
    multiline: true,
    rows: 4,
  },
]

export function GettingToKnowPanel({ partId, partSlug, initial }: Props) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<PartUserFields>(initial)
  const [saved, setSaved] = useState<PartUserFields>(initial)
  const [savingKey, setSavingKey] = useState<FieldKey | null>(null)

  const handleChange = (key: FieldKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const handleBlur = async (key: FieldKey) => {
    const next = (values[key] ?? '').trim()
    const prev = saved[key] ?? ''
    if (next === prev) return

    setSavingKey(key)
    try {
      const res = await fetch(`/api/parts/${partId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Could not save')
        setValues((v) => ({ ...v, [key]: saved[key] ?? '' }))
        return
      }
      const body = (await res.json()) as { part: PartUserFields }
      const nextSaved = { ...saved, [key]: body.part[key] ?? null }
      setSaved(nextSaved)
      setValues((v) => ({ ...v, [key]: body.part[key] ?? '' }))
      // Keep the part query in sync for anything else on the page that reads it.
      queryClient.invalidateQueries({ queryKey: ['part', partSlug] })
    } catch {
      toast.error('Network error')
      setValues((v) => ({ ...v, [key]: saved[key] ?? '' }))
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-baseline justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Getting to know this part</h2>
          <p className="text-sm text-muted-foreground">
            Optional. Add what you've learned as you've sat with it.
          </p>
        </div>
        {savingKey && (
          <span className="text-xs text-muted-foreground shrink-0" aria-live="polite">
            Saving…
          </span>
        )}
      </div>
      <dl className="space-y-5">
        {FIELDS.map(({ key, label, helper, multiline, rows }) => (
          <div key={key}>
            <dt className="mb-1">
              <label
                htmlFor={`part-field-${key}`}
                className="block text-sm font-medium text-foreground"
              >
                {label}
              </label>
              <span className="block text-xs text-muted-foreground">{helper}</span>
            </dt>
            <dd>
              {multiline ? (
                <textarea
                  id={`part-field-${key}`}
                  value={values[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  onBlur={() => handleBlur(key)}
                  rows={rows ?? 2}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none bg-background"
                  placeholder="—"
                />
              ) : (
                <input
                  id={`part-field-${key}`}
                  type="text"
                  value={values[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  onBlur={() => handleBlur(key)}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none bg-background"
                  placeholder="—"
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
