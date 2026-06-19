import { useState, useEffect } from 'react'
import { store } from '../lib/storage'
import { testGroqKey } from '../lib/groq'
import { useNavigate } from 'react-router-dom'

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', note: 'Best quality — recommended' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', note: 'Fastest, great for quick lines' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', note: 'Good for longer lyric blocks' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B', note: 'Lightweight alternative' }
]

export default function Settings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(store.getSettings())
  const [keyInput, setKeyInput] = useState(store.getSettings().groqApiKey || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saved, setSaved] = useState(false)

  async function handleTest() {
    if (!keyInput.trim()) return
    setTesting(true)
    setTestResult(null)
    const ok = await testGroqKey(keyInput.trim())
    setTestResult(ok ? 'success' : 'fail')
    setTesting(false)
  }

  function save() {
    const updated = { ...settings, groqApiKey: keyInput.trim() }
    store.setSettings(updated)
    setSettings(updated)
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 2000)
  }

  function setModel(model) {
    const updated = { ...settings, groqModel: model }
    setSettings(updated)
    store.setSettings({ ...store.getSettings(), groqModel: model })
  }

  function resetOnboarding() {
    store.setOnboarded(false)
    store.setSoundBible(null)
    navigate('/onboarding')
  }

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-rust mb-2">Configuration</p>
        <h1 className="font-display text-3xl sm:text-4xl italic">Settings</h1>
      </div>

      {/* API Key */}
      <section className="mb-10">
        <h2 className="font-medium mb-1">Groq API Key</h2>
        <p className="text-xs text-ink-soft mb-4 leading-relaxed">
          LyricBench uses Groq for fast AI inference. Get a free API key at{' '}
          <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-rust underline">
            console.groq.com
          </a>
          . Your key is stored locally and never sent anywhere except Groq's API.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => { setKeyInput(e.target.value); setTestResult(null) }}
            placeholder="gsk_…"
            className="flex-1 bg-white border border-rule rounded-sm px-3 py-2.5 text-sm font-mono focus:border-rust outline-none"
          />
          <button
            onClick={handleTest}
            disabled={!keyInput.trim() || testing}
            className="px-4 py-2.5 border border-ink rounded-sm text-sm hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            {testing ? 'Testing…' : 'Test'}
          </button>
        </div>
        {testResult === 'success' && (
          <p className="text-moss text-sm mb-3 animate-fade-up">✓ Key works — ready to write.</p>
        )}
        {testResult === 'fail' && (
          <p className="text-rust text-sm mb-3 animate-fade-up">✗ Key rejected. Double-check it at console.groq.com.</p>
        )}
        <button
          onClick={save}
          className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm tracking-wide hover:bg-rust transition-colors"
        >
          Save key
        </button>
        {saved && <span className="text-moss text-sm ml-4 animate-fade-up">Saved.</span>}
      </section>

      {/* Model selection */}
      <section className="mb-10">
        <h2 className="font-medium mb-1">Model</h2>
        <p className="text-xs text-ink-soft mb-4">All models are available on Groq's free tier. Llama 3.3 70B gives the best lyric quality.</p>
        <div className="flex flex-col gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`text-left px-4 py-3 rounded-sm border transition-colors ${
                settings.groqModel === m.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule hover:border-ink-soft'
              }`}
            >
              <span className="block text-sm font-medium">{m.label}</span>
              <span className={`block text-xs mt-0.5 ${settings.groqModel === m.id ? 'text-paper/70' : 'text-ink-soft'}`}>{m.note}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className="mb-10">
        <h2 className="font-medium mb-1">Your data</h2>
        <p className="text-xs text-ink-soft mb-4 leading-relaxed">
          All songs and your Sound Bible are stored in your browser's localStorage. Nothing is uploaded or synced anywhere.
        </p>
        <button
          onClick={resetOnboarding}
          className="text-sm text-rust border border-rust/40 px-4 py-2 rounded-sm hover:bg-rust hover:text-paper transition-colors"
        >
          Reset Sound Bible & redo onboarding
        </button>
      </section>

      {/* About */}
      <section className="pt-6 border-t border-rule">
        <p className="text-xs text-ink-soft leading-relaxed">
          LyricBench is a local-first songwriting notebook. No account, no subscription, no cloud. Just you, the words, and a model that knows your style.
        </p>
      </section>
    </div>
  )
}
