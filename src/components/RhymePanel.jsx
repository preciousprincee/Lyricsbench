import { useState, useEffect, useCallback } from 'react'
import { groqChat } from '../lib/groq'
import { buildSystemPrompt } from '../lib/promptBuilder'
import { store } from '../lib/storage'
import { rhymeScore } from '../lib/cadence'

// Simple common word list for fast offline slant-rhyme detection
// against words already used in the lyric
function lastWord(line) {
  const words = line.trim().split(/\s+/)
  return words[words.length - 1]?.replace(/[^a-zA-Z']/g, '') || ''
}

function extractEndWords(lyrics) {
  return lyrics
    .split('\n')
    .map((l) => lastWord(l))
    .filter(Boolean)
}

export default function RhymePanel({ lyrics, currentLine, preWrite, onInsert }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [word, setWord] = useState('')

  const targetWord = lastWord(currentLine || '')

  async function fetchRhymes(w) {
    if (!w || w.length < 2) return
    setLoading(true)
    setError('')
    const endWords = extractEndWords(lyrics).filter(
      (ew) => ew.toLowerCase() !== w.toLowerCase()
    )
    const bible = store.getSoundBible()
    const system = buildSystemPrompt(bible, preWrite)

    const prompt = [
      `The songwriter is looking for words that rhyme with or sound close to "${w}".`,
      endWords.length ? `Words already used as line-endings in this song: ${endWords.slice(-12).join(', ')}.` : '',
      'Return 10 rhyme suggestions as a plain list, one word per line, no numbering, no commentary.',
      'Mix perfect rhymes, slant rhymes, and near-rhymes. Prefer words that fit the song\'s themes and vocabulary.',
      'Return ONLY the word list.'
    ].filter(Boolean).join(' ')

    try {
      const reply = await groqChat(
        [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        { temperature: 0.85, maxTokens: 120 }
      )
      const words = reply.split('\n').map((l) => l.trim()).filter((l) => l && /^[a-zA-Z']+$/.test(l))
      // Score against already-used end words to show rhyme chains
      const scored = words.map((w2) => ({
        word: w2,
        score: Math.max(...endWords.map((ew) => rhymeScore(w2, ew)), 0)
      }))
      setSuggestions(scored)
    } catch (err) {
      setError(err.message || 'Could not fetch rhymes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (targetWord && targetWord !== word) {
      setWord(targetWord)
      const timer = setTimeout(() => fetchRhymes(targetWord), 600)
      return () => clearTimeout(timer)
    }
  }, [targetWord])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">Rhymes</p>
        {word && <span className="text-xs text-rust font-mono">→ {word}</span>}
      </div>

      {!word && (
        <p className="text-xs text-ink-soft leading-relaxed mt-2">
          Move your cursor to a line to see rhyme suggestions for its last word.
        </p>
      )}

      {loading && (
        <div className="flex flex-col gap-1.5 mt-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-7 bg-rule/40 rounded-sm animate-pulse-soft" style={{ width: `${50 + i * 8}%` }} />
          ))}
        </div>
      )}

      {error && <p className="text-rust text-xs mt-2">{error}</p>}

      {!loading && suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          {suggestions.map((s) => (
            <button
              key={s.word}
              onClick={() => onInsert(s.word)}
              className="text-left px-2 py-1.5 rounded-sm text-sm hover:bg-paper-dim flex items-center justify-between group transition-colors"
            >
              <span>{s.word}</span>
              {s.score > 0.4 && (
                <span className="text-[9px] uppercase tracking-wider text-moss opacity-0 group-hover:opacity-100 transition-opacity">
                  rhymes
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
