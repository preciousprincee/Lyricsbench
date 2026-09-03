import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { store } from '../lib/storage'
import { getAvailableModels, getModelPreference, setModelPreference } from '../lib/localSettings'
import { useAuth } from '../context/AuthContext'

const MODELS = getAvailableModels()

export default function Settings() {
  const navigate = useNavigate()
  const { summary, summaryLoading } = useAuth()
  const [model, setModel] = useState(getModelPreference())
  const [resetting, setResetting] = useState(false)

  function chooseModel(id) {
    setModel(id)
    setModelPreference(id)
  }

  async function resetOnboarding() {
    setResetting(true)
    try {
      await store.setOnboarded(false)
      await store.setSoundBible({
        themes: [], vocabulary: '', imagery: '', rhymeHabits: '',
        structureHabits: '', toneDefault: '', influences: [], freeform: ''
      })
      navigate('/onboarding')
    } finally {
      setResetting(false)
    }
  }

  const profile = summary?.profile
  const usage = summary?.usage
  const usagePct = usage ? Math.min(100, Math.round((usage.generations_used / Math.max(usage.generations_limit, 1)) * 100)) : 0

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-rust mb-2">Configuration</p>
        <h1 className="font-display text-3xl sm:text-4xl italic">Settings</h1>
      </div>

      {/* Account */}
      <section className="mb-10">
        <h2 className="font-medium mb-1">Account</h2>
        <p className="text-sm text-ink-soft">{profile?.email}</p>
      </section>

      {/* Usage */}
      <section className="mb-10">
        <h2 className="font-medium mb-1">AI usage</h2>

        {summaryLoading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : usage ? (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-ink-soft mb-1.5">
              <span>AI generations this month</span>
              <span>{usage.generations_used} / {usage.generations_limit}</span>
            </div>
            <div className="h-1.5 bg-paper-dim rounded-full overflow-hidden">
              <div
                className={`h-full ${usagePct > 90 ? 'bg-rust' : 'bg-moss'} transition-all`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Model selection */}
      <section className="mb-10">
        <h2 className="font-medium mb-1">Model</h2>
        <p className="text-xs text-ink-soft mb-4">
          The AI runs on our servers via Groq — no API key needed. Llama 3.3 70B gives the best lyric quality.
        </p>
        <div className="flex flex-col gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => chooseModel(m.id)}
              className={`text-left px-4 py-3 rounded-sm border transition-colors ${
                model === m.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule hover:border-ink-soft'
              }`}
            >
              <span className="block text-sm font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className="mb-10">
        <h2 className="font-medium mb-1">Your Sound Bible</h2>
        <p className="text-xs text-ink-soft mb-4 leading-relaxed">
          Your songs and Sound Bible are stored securely in your account, synced across devices.
        </p>
        <button
          onClick={resetOnboarding}
          disabled={resetting}
          className="text-sm text-rust border border-rust/40 px-4 py-2 rounded-sm hover:bg-rust hover:text-paper transition-colors disabled:opacity-50"
        >
          {resetting ? 'Resetting…' : 'Reset Sound Bible & redo onboarding'}
        </button>
      </section>

      {/* About */}
      <section className="pt-6 border-t border-rule">
        <p className="text-xs text-ink-soft leading-relaxed">
          LyricBench — your songwriting notebook, synced to your account. Includes {usage?.generations_limit ?? 'a monthly allowance of'} AI generations a month.
        </p>
      </section>
    </div>
  )
}
