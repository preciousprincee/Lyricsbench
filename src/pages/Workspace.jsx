import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { store } from '../lib/storage'
import { groqChat } from '../lib/groq'
import { buildSystemPrompt } from '../lib/promptBuilder'
import CadenceRuler from '../components/CadenceRuler.jsx'
import RhymePanel from '../components/RhymePanel.jsx'
import PreWriteModal from '../components/PreWriteModal.jsx'

const MODES = [
  { id: 'full', label: 'Full verse', prompt: (section) => `Write a full ${section || 'verse'} for this song. Return only the lyrics, no commentary.` },
  { id: 'next', label: 'Next line', prompt: () => 'Write the next line. Return only that one line.' },
  { id: 'options', label: '3 alternatives', prompt: (_, line) => `Give me 3 alternative versions of this line: "${line || '[the last line written]'}". Return only the 3 options, one per line, no numbers.` }
]

const SECTIONS = ['verse', 'chorus', 'pre-chorus', 'bridge', 'hook', 'outro', 'intro']

export default function Workspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [song, setSong] = useState(null)
  const [lyrics, setLyrics] = useState('')
  const [title, setTitle] = useState('')
  const [showPreWrite, setShowPreWrite] = useState(false)
  const [preWrite, setPreWrite] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [aiMode, setAiMode] = useState('full')
  const [section, setSection] = useState('verse')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [currentLine, setCurrentLine] = useState('')
  const [showRhymes, setShowRhymes] = useState(true)
  const [showCadence, setShowCadence] = useState(true)
  const [aiDraft, setAiDraft] = useState('')
  const [showDraft, setShowDraft] = useState(false)
  const textareaRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    const s = store.getSong(id)
    if (!s) { navigate('/'); return }
    setSong(s)
    setLyrics(s.lyrics || '')
    setTitle(s.title || 'Untitled')
    setPreWrite(s.preWrite || null)
    if (!s.preWrite) setShowPreWrite(true)
  }, [id])

  function autosave(newLyrics, newTitle, newPreWrite) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const updated = {
        ...song, id,
        lyrics: newLyrics ?? lyrics,
        title: newTitle ?? title,
        preWrite: newPreWrite ?? preWrite,
        updatedAt: Date.now()
      }
      store.saveSong(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }, 800)
  }

  function handleLyricsChange(e) {
    const val = e.target.value
    setLyrics(val)
    autosave(val, undefined, undefined)
    // Track current line under cursor for rhyme panel
    const pos = e.target.selectionStart
    const before = val.substring(0, pos)
    const lineStart = before.lastIndexOf('\n') + 1
    const lineEnd = val.indexOf('\n', pos)
    const line = val.substring(lineStart, lineEnd === -1 ? val.length : lineEnd)
    setCurrentLine(line)
  }

  function handleTitleChange(e) {
    setTitle(e.target.value)
    autosave(undefined, e.target.value, undefined)
  }

  function handlePreWriteStart(pw) {
    setPreWrite(pw)
    setShowPreWrite(false)
    autosave(undefined, undefined, pw)
  }

  async function generate() {
    if (generating) return
    setError('')
    setGenerating(true)
    const bible = store.getSoundBible()
    const system = buildSystemPrompt(bible, preWrite)

    // Build context: include existing lyrics so the AI knows where we are
    const lastLine = lyrics.trim().split('\n').filter(Boolean).pop() || ''
    const modeConfig = MODES.find((m) => m.id === aiMode)
    const userMsg = [
      lyrics.trim() ? `Here are the lyrics so far:\n\n${lyrics.trim()}` : '',
      modeConfig.prompt(section, lastLine)
    ].filter(Boolean).join('\n\n')

    try {
      const reply = await groqChat(
        [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        { temperature: 0.92, maxTokens: 400 }
      )
      setAiDraft(reply.trim())
      setShowDraft(true)
    } catch (err) {
      setError(err.message || 'Generation failed. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  function acceptDraft() {
    const separator = lyrics.trim() ? '\n\n' : ''
    const updated = lyrics + separator + aiDraft
    setLyrics(updated)
    autosave(updated, undefined, undefined)
    setShowDraft(false)
    setAiDraft('')
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = textareaRef.current.value.length
      }
    }, 50)
  }

  function dismissDraft() {
    setShowDraft(false)
    setAiDraft('')
  }

  function insertRhymeWord(word) {
    if (!textareaRef.current) return
    const ta = textareaRef.current
    const pos = ta.selectionStart
    const val = ta.value
    // Insert at end of current line
    const lineEnd = val.indexOf('\n', pos)
    const insertAt = lineEnd === -1 ? val.length : lineEnd
    const updated = val.substring(0, insertAt) + ' ' + word + val.substring(insertAt)
    setLyrics(updated)
    autosave(updated, undefined, undefined)
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = insertAt + word.length + 1
    }, 20)
  }

  if (!song && !showPreWrite) return null

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Title bar */}
      <div className="border-b border-rule px-5 sm:px-8 py-3 flex items-center gap-4 flex-shrink-0">
        <input
          value={title}
          onChange={handleTitleChange}
          className="font-display text-lg italic bg-transparent border-none outline-none flex-1 min-w-0"
          placeholder="Song title…"
        />
        <div className="flex items-center gap-3 flex-shrink-0">
          {saved && <span className="text-xs text-moss animate-fade-up">Saved</span>}
          <button
            onClick={() => setShowPreWrite(true)}
            className="text-xs text-ink-soft hover:text-rust border border-rule px-3 py-1.5 rounded-sm transition-colors"
          >
            Song settings
          </button>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Cadence ruler */}
        {showCadence && (
          <div className="hidden sm:block w-24 border-r border-rule overflow-hidden flex-shrink-0">
            <div className="px-2 pt-3 pb-1 border-b border-rule flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.15em] text-ink-soft">Cadence</span>
              <button onClick={() => setShowCadence(false)} className="text-[10px] text-rule hover:text-ink-soft">✕</button>
            </div>
            <div className="overflow-y-hidden pt-1">
              <CadenceRuler text={lyrics} />
            </div>
          </div>
        )}

        {/* Center: Lyrics editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <textarea
            ref={textareaRef}
            value={lyrics}
            onChange={handleLyricsChange}
            onKeyUp={handleLyricsChange}
            onClick={handleLyricsChange}
            placeholder={"Start writing here, or ask the AI to draft something below…"}
            className="lyric-textarea flex-1 w-full bg-transparent resize-none px-6 sm:px-10 pt-4 pb-8 text-sm sm:text-base leading-[36px] focus:outline-none placeholder:text-rule"
            spellCheck
          />
        </div>

        {/* Right: Rhyme panel */}
        {showRhymes && (
          <div className="hidden md:flex w-44 border-l border-rule flex-col overflow-hidden flex-shrink-0">
            <div className="px-3 pt-3 pb-1 border-b border-rule flex items-center justify-between flex-shrink-0">
              <span className="text-[9px] uppercase tracking-[0.15em] text-ink-soft">Rhymes</span>
              <button onClick={() => setShowRhymes(false)} className="text-[10px] text-rule hover:text-ink-soft">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
              <RhymePanel
                lyrics={lyrics}
                currentLine={currentLine}
                preWrite={preWrite}
                onInsert={insertRhymeWord}
              />
            </div>
          </div>
        )}
      </div>

      {/* AI draft overlay */}
      {showDraft && aiDraft && (
        <div className="border-t-2 border-rust bg-paper-dim px-5 sm:px-8 py-4 flex-shrink-0 animate-fade-up">
          <p className="text-[10px] uppercase tracking-[0.2em] text-rust mb-3">AI draft — accept or dismiss</p>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-body mb-4 text-ink">{aiDraft}</pre>
          <div className="flex gap-3">
            <button
              onClick={acceptDraft}
              className="bg-ink text-paper px-5 py-2 rounded-sm text-sm hover:bg-rust transition-colors"
            >
              Accept into lyrics
            </button>
            <button
              onClick={generate}
              disabled={generating}
              className="border border-ink px-4 py-2 rounded-sm text-sm hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
            >
              Try again
            </button>
            <button
              onClick={dismissDraft}
              className="text-sm text-ink-soft hover:text-ink underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* AI toolbar */}
      <div className="border-t border-rule px-4 sm:px-8 py-3 flex flex-wrap items-center gap-3 flex-shrink-0 bg-paper">
        {/* Mode selector */}
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setAiMode(m.id)}
              className={`text-xs px-3 py-1.5 rounded-sm border transition-colors ${
                aiMode === m.id ? 'bg-ink text-paper border-ink' : 'border-rule hover:border-ink-soft'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Section selector (only for full verse mode) */}
        {aiMode === 'full' && (
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="text-xs border border-rule rounded-sm px-2 py-1.5 bg-white focus:border-rust outline-none"
          >
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        )}

        <button
          onClick={generate}
          disabled={generating}
          className="bg-rust text-paper px-5 py-1.5 rounded-sm text-sm tracking-wide hover:bg-rust-soft transition-colors disabled:opacity-50 ml-auto"
        >
          {generating ? 'Writing…' : 'Generate ✦'}
        </button>

        {/* Toggle hidden panels */}
        <div className="hidden sm:flex gap-2">
          {!showCadence && (
            <button onClick={() => setShowCadence(true)} className="text-xs text-ink-soft hover:text-ink border border-rule rounded-sm px-2 py-1">
              cadence
            </button>
          )}
          {!showRhymes && (
            <button onClick={() => setShowRhymes(true)} className="text-xs text-ink-soft hover:text-ink border border-rule rounded-sm px-2 py-1 hidden md:block">
              rhymes
            </button>
          )}
        </div>

        {error && <p className="w-full text-xs text-rust mt-1">{error}</p>}
      </div>

      {showPreWrite && (
        <PreWriteModal onStart={handlePreWriteStart} existingPreWrite={preWrite} />
      )}
    </div>
  )
}
