import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { store } from '../lib/storage'

const FIELDS = [
  { key: 'themes', label: 'Themes', type: 'tags', hint: 'What you tend to write about' },
  { key: 'vocabulary', label: 'Vocabulary', type: 'text', hint: 'How you use language — plain/conversational, literary, slang-heavy, dense…' },
  { key: 'imagery', label: 'Imagery', type: 'text', hint: 'Visual/concrete vs abstract/emotional, nature vs urban, etc.' },
  { key: 'rhymeHabits', label: 'Rhyme habits', type: 'text', hint: 'Tight couplets, slant rhyme, near-free-verse, internal rhyme…' },
  { key: 'structureHabits', label: 'Structure habits', type: 'text', hint: 'Typical song shapes you gravitate toward' },
  { key: 'toneDefault', label: 'Default tone', type: 'text', hint: 'The emotional register you most often write from' },
  { key: 'influences', label: 'Flow references', type: 'tags', hint: 'Artists whose cadence/delivery you borrow from (flow reference, not lyric copy)' },
  { key: 'freeform', label: 'Anything else', type: 'textarea', hint: 'Anything that matters about how you write that doesn\'t fit above' }
]

export default function SoundBible() {
  const navigate = useNavigate()
  const [bible, setBible] = useState(null)
  const [saved, setSaved] = useState(false)
  const [tagInput, setTagInput] = useState({ themes: '', influences: '' })

  useEffect(() => {
    const b = store.getSoundBible()
    if (b) setBible(b)
    else setBible({ themes: [], vocabulary: '', imagery: '', rhymeHabits: '', structureHabits: '', toneDefault: '', influences: [], freeform: '' })
  }, [])

  function update(key, value) {
    setBible((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function save() {
    store.setSoundBible(bible)
    store.setOnboarded(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addTag(field) {
    const val = tagInput[field]?.trim()
    if (!val || bible[field]?.includes(val)) return
    update(field, [...(bible[field] || []), val])
    setTagInput((p) => ({ ...p, [field]: '' }))
  }

  function removeTag(field, tag) {
    update(field, bible[field].filter((t) => t !== tag))
  }

  if (!bible) return null

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-rust mb-2">Your identity</p>
        <h1 className="font-display text-3xl sm:text-4xl italic">Sound Bible</h1>
        <p className="text-ink-soft text-sm mt-2 leading-relaxed">
          This is your default writing identity. Every song you write starts from here, then gets nudged per-song in the workspace.
        </p>
      </div>

      <div className="flex flex-col gap-7">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <p className="text-xs text-ink-soft mb-2">{field.hint}</p>

            {field.type === 'tags' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(bible[field.key] || []).map((tag) => (
                    <span key={tag} className="flex items-center gap-1.5 bg-paper-dim border border-rule px-3 py-1 rounded-sm text-sm">
                      {tag}
                      <button onClick={() => removeTag(field.key, tag)} className="text-ink-soft hover:text-rust text-xs">✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput[field.key] || ''}
                    onChange={(e) => setTagInput((p) => ({ ...p, [field.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(field.key)}
                    placeholder="Add and press Enter"
                    className="flex-1 bg-white border border-rule rounded-sm px-3 py-2 text-sm focus:border-rust outline-none"
                  />
                  <button
                    onClick={() => addTag(field.key)}
                    className="px-4 py-2 border border-ink text-sm rounded-sm hover:bg-ink hover:text-paper transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {field.type === 'text' && (
              <input
                value={bible[field.key] || ''}
                onChange={(e) => update(field.key, e.target.value)}
                className="w-full bg-white border border-rule rounded-sm px-3 py-2.5 text-sm focus:border-rust outline-none"
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                value={bible[field.key] || ''}
                onChange={(e) => update(field.key, e.target.value)}
                rows={3}
                className="w-full bg-white border border-rule rounded-sm px-3 py-2.5 text-sm focus:border-rust outline-none resize-none"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-4">
        <button
          onClick={save}
          className="bg-ink text-paper px-6 py-2.5 rounded-sm text-sm tracking-wide hover:bg-rust transition-colors"
        >
          Save Sound Bible
        </button>
        {saved && <span className="text-moss text-sm animate-fade-up">Saved.</span>}
        <button
          onClick={() => navigate('/')}
          className="text-sm text-ink-soft hover:text-ink underline"
        >
          Back to Library
        </button>
      </div>
    </div>
  )
}
