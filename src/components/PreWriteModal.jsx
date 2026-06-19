import { useState } from 'react'
import { store } from '../lib/storage'

const STRUCTURES = ['Verse / Chorus / Verse / Chorus / Bridge / Chorus', 'Verse / Verse / Chorus / Verse / Chorus', 'Free form / No fixed structure', 'Verse / Verse / Verse (no chorus)', 'Intro / Verse / Pre-Chorus / Chorus / Outro']
const CADENCES = ['Dense / syllable-heavy, fast flow', 'Balanced / mid-tempo, conversational', 'Spacious / minimal syllables, room to breathe', 'Irregular / deliberate rhythm breaks']
const RHYME_SCHEMES = ['Tight / perfect rhymes, every line', 'Moderate / rhymes on end of 2nd and 4th lines (ABCB)', 'Loose / slant rhymes and near-misses only', 'Free / no required rhyme']
const TONES = ['Reflective / introspective, quiet', 'Melancholic / sad but not angry', 'Raw / exposed, confessional', 'Defiant / confident, charged', 'Wistful / nostalgic, bittersweet', 'Playful / light, sharp wit']

export default function PreWriteModal({ onStart, existingPreWrite }) {
  const bible = store.getSoundBible()
  const [preWrite, setPreWrite] = useState(existingPreWrite || {
    structure: STRUCTURES[0],
    cadence: CADENCES[1],
    rhymeScheme: RHYME_SCHEMES[1],
    tone: '',
    flowReference: '',
    subject: ''
  })

  function set(key, val) {
    setPreWrite((p) => ({ ...p, [key]: val }))
  }

  function Selector({ label, options, field }) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">{label}</label>
        <div className="flex flex-col gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => set(field, opt)}
              className={`text-left px-3 py-2.5 rounded-sm text-sm border transition-colors ${
                preWrite[field] === opt
                  ? 'border-rust bg-rust text-paper'
                  : 'border-rule hover:border-ink-soft'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-paper rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin shadow-notebook animate-fade-up">
        <div className="px-6 pt-7 pb-4 border-b border-rule sticky top-0 bg-paper">
          <p className="text-xs uppercase tracking-[0.2em] text-rust mb-1">Before you write</p>
          <h2 className="font-display text-2xl italic">How does this song go?</h2>
          <p className="text-xs text-ink-soft mt-1">These override your Sound Bible defaults for this song only.</p>
        </div>
        <div className="px-6 py-6">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">What is this song about?</label>
            <input
              value={preWrite.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="e.g. The last conversation before someone leaves"
              className="w-full bg-white border border-rule rounded-sm px-3 py-2.5 text-sm focus:border-rust outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Flow reference <span className="font-normal text-ink-soft">(optional)</span></label>
            <input
              value={preWrite.flowReference}
              onChange={(e) => set('flowReference', e.target.value)}
              placeholder={bible?.influences?.length ? `e.g. ${bible.influences[0]}` : 'e.g. J. Cole, Phoebe Bridgers, Kendrick…'}
              className="w-full bg-white border border-rule rounded-sm px-3 py-2.5 text-sm focus:border-rust outline-none"
            />
            <p className="text-xs text-ink-soft mt-1">Used as a cadence/delivery reference only — no lyric copying.</p>
          </div>

          <Selector label="Song structure" options={STRUCTURES} field="structure" />
          <Selector label="Flow & cadence" options={CADENCES} field="cadence" />
          <Selector label="Rhyme tightness" options={RHYME_SCHEMES} field="rhymeScheme" />
          <Selector label="Tone / mood" options={TONES} field="tone" />
        </div>
        <div className="px-6 pb-7 pt-2 sticky bottom-0 bg-paper border-t border-rule">
          <button
            onClick={() => onStart(preWrite)}
            className="w-full bg-ink text-paper py-3 rounded-sm text-sm tracking-wide hover:bg-rust transition-colors"
          >
            Start writing
          </button>
        </div>
      </div>
    </div>
  )
}
