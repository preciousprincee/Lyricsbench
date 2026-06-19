import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { groqChat, groqJSON, GroqError } from '../lib/groq'
import { ONBOARDING_SYSTEM_PROMPT, EXTRACT_PROFILE_PROMPT } from '../lib/promptBuilder'
import { store } from '../lib/storage'

const FIRST_QUESTION = "Let's build your Sound Bible — a profile of how you write, so I can help in your voice, not a generic one. First: what do your songs tend to be about? Doesn't need to be one thing."

export default function Onboarding({ onComplete }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'chat' | 'paste' | null
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const scrollRef = useRef(null)
  const hasKey = !!store.getSettings().groqApiKey

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  function startChat() {
    setMode('chat')
    setMessages([{ role: 'assistant', content: FIRST_QUESTION }])
  }

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const reply = await groqChat(
        [{ role: 'system', content: ONBOARDING_SYSTEM_PROMPT }, ...next],
        { temperature: 0.8, maxTokens: 200 }
      )
      const updated = [...next, { role: 'assistant', content: reply }]
      setMessages(updated)

      // Heuristic: once the assistant has asked enough questions, it tends
      // to signal wrap-up language. We also hard-cap at 9 assistant turns.
      const assistantTurns = updated.filter((m) => m.role === 'assistant').length
      if (assistantTurns >= 7 && /good (picture|sense|read)|summar|sound bible is|here's what i'm hearing/i.test(reply)) {
        await finishFromChat(updated)
      }
    } catch (err) {
      setError(err instanceof GroqError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function finishFromChat(transcript) {
    setFinishing(true)
    setError('')
    try {
      const convoText = transcript.map((m) => `${m.role === 'user' ? 'Songwriter' : 'Interviewer'}: ${m.content}`).join('\n')
      const profile = await groqJSON([
        { role: 'system', content: EXTRACT_PROFILE_PROMPT },
        { role: 'user', content: convoText }
      ], { temperature: 0.3 })

      store.setSoundBible(profile)
      store.setOnboarded(true)
      onComplete()
      navigate('/sound-bible')
    } catch (err) {
      setError(err instanceof GroqError ? err.message : 'Could not build your profile. Try again.')
    } finally {
      setFinishing(false)
    }
  }

  async function finishFromPaste() {
    if (!pasteText.trim()) return
    setFinishing(true)
    setError('')
    try {
      const profile = await groqJSON([
        {
          role: 'system',
          content: EXTRACT_PROFILE_PROMPT.replace(
            'the conversation below between an interviewer and a songwriter',
            "the text below, which is a songwriter's own description of their style, or their existing style guide"
          )
        },
        { role: 'user', content: pasteText.trim() }
      ], { temperature: 0.3 })

      store.setSoundBible(profile)
      store.setOnboarded(true)
      onComplete()
      navigate('/sound-bible')
    } catch (err) {
      setError(err instanceof GroqError ? err.message : 'Could not read that profile. Try again.')
    } finally {
      setFinishing(false)
    }
  }

  function skipForNow() {
    store.setSoundBible({
      themes: [], vocabulary: '', imagery: '', rhymeHabits: '',
      structureHabits: '', toneDefault: '', influences: [], freeform: ''
    })
    store.setOnboarded(true)
    onComplete()
    navigate('/sound-bible')
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-up">
          <h1 className="font-display text-3xl italic mb-3">LyricBench</h1>
          <p className="text-ink-soft mb-6">You'll need a Groq API key before we can talk. Add one in Settings — it's free to get and only takes a minute.</p>
          <button
            onClick={() => navigate('/settings')}
            className="bg-ink text-paper px-6 py-2.5 rounded-sm text-sm tracking-wide hover:bg-rust transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  if (mode === null) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-lg w-full animate-fade-up">
          <p className="text-xs uppercase tracking-[0.2em] text-rust mb-3">Before you write</p>
          <h1 className="font-display text-4xl sm:text-5xl italic leading-tight mb-4">
            Let's find your sound.
          </h1>
          <p className="text-ink-soft mb-10 leading-relaxed">
            Your Sound Bible is the style this app defaults to — what you write about, how you say it, how it rhymes and moves. Build it through a quick conversation, or paste one in if you've already got it figured out.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={startChat}
              className="text-left border border-ink rounded-sm px-5 py-4 hover:bg-ink hover:text-paper transition-colors group"
            >
              <span className="block font-medium mb-1">Talk it through</span>
              <span className="block text-sm text-ink-soft group-hover:text-paper/70">A few quick questions, conversational, takes about two minutes.</span>
            </button>
            <button
              onClick={() => setMode('paste')}
              className="text-left border border-ink rounded-sm px-5 py-4 hover:bg-ink hover:text-paper transition-colors group"
            >
              <span className="block font-medium mb-1">Paste my own</span>
              <span className="block text-sm text-ink-soft group-hover:text-paper/70">You already have a style guide or know exactly what you want.</span>
            </button>
            <button
              onClick={skipForNow}
              className="text-sm text-ink-soft hover:text-ink underline mt-2 self-center"
            >
              Skip for now, decide later
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'paste') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-lg w-full animate-fade-up">
          <button onClick={() => setMode(null)} className="text-sm text-ink-soft hover:text-ink mb-6">← Back</button>
          <h1 className="font-display text-3xl italic mb-3">Paste your style</h1>
          <p className="text-ink-soft mb-6 text-sm leading-relaxed">
            Drop in a style guide, a description of how you write, or even a few of your past lyrics. We'll turn it into your Sound Bible.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="e.g. I write mostly about leaving small towns and people I've outgrown. Plain language, no big words. Loose rhymes, not forced couplets. Verse-chorus-verse-chorus-bridge-chorus, always..."
            className="w-full h-56 bg-white border border-rule rounded-sm p-4 text-sm leading-relaxed focus:border-rust outline-none resize-none"
          />
          {error && <p className="text-rust text-sm mt-3">{error}</p>}
          <button
            onClick={finishFromPaste}
            disabled={!pasteText.trim() || finishing}
            className="mt-5 bg-ink text-paper px-6 py-2.5 rounded-sm text-sm tracking-wide hover:bg-rust transition-colors disabled:opacity-40 disabled:hover:bg-ink"
          >
            {finishing ? 'Reading it…' : 'Build my Sound Bible'}
          </button>
        </div>
      </div>
    )
  }

  // Chat mode
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-10 sm:py-16">
        <div className="max-w-xl mx-auto flex flex-col gap-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`animate-fade-up ${m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[90%]'}`}
            >
              {m.role === 'assistant' ? (
                <p className="font-display text-xl sm:text-2xl leading-snug text-ink">{m.content}</p>
              ) : (
                <p className="bg-ink text-paper px-4 py-2.5 rounded-sm text-sm leading-relaxed">{m.content}</p>
              )}
            </div>
          ))}
          {(loading || finishing) && (
            <p className="text-ink-soft text-sm animate-pulse-soft">
              {finishing ? 'Putting your Sound Bible together…' : 'thinking…'}
            </p>
          )}
          {error && <p className="text-rust text-sm">{error}</p>}
        </div>
      </div>
      <div className="border-t border-rule px-6 py-5">
        <div className="max-w-xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type your answer…"
            disabled={loading || finishing}
            autoFocus
            className="flex-1 bg-white border border-rule rounded-sm px-4 py-3 text-sm focus:border-rust outline-none disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading || finishing}
            className="bg-ink text-paper px-5 rounded-sm text-sm hover:bg-rust transition-colors disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
