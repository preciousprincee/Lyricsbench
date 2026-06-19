// Lightweight English syllable + stress estimator.
// Not phonetically perfect, but good enough for real-time "does this line scan"
// feedback, which is the actual job: relative comparison between lines,
// not absolute linguistic accuracy.

const SUBSYLLABLES = [
  'cial', 'tia', 'cius', 'cious', 'giu', 'ion', 'iou', 'sia$', 'eous',
  'ely$', 'ially$'
]
const ADD_SYLLABLE = [
  'ia', 'riet', 'dien', 'iu', 'io', 'ii', '[aeiouy]bl$', 'mbl$',
  '[aeiou]{3}', '^mc', 'ism$', '([^aeiouy])\\1l$', '[^l]llien', '^coa[dglx].',
  '[^gq]ua[^auieo]', 'dnt$'
]
const SUB_SYLLABLE = [
  'cial', 'tia', 'cius', 'cious', 'uiet', 'gious', 'geous', 'priest', 'giu',
  'dge', 'ion', 'iou', '^every', 'ely$', '^ninet', '^twent', '^drought'
]

function countVowelGroups(word) {
  const groups = word.toLowerCase().match(/[aeiouy]+/g)
  return groups ? groups.length : 0
}

export function countSyllables(word) {
  if (!word) return 0
  let w = word.toLowerCase().replace(/[^a-z']/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1

  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  w = w.replace(/^y/, '')

  let count = countVowelGroups(w)

  for (const pattern of SUB_SYLLABLE) {
    if (new RegExp(pattern).test(w)) count -= 1
  }
  for (const pattern of ADD_SYLLABLE) {
    if (new RegExp(pattern).test(w)) count += 1
  }

  return Math.max(1, count)
}

export function countLineSyllables(line) {
  const words = line.trim().split(/\s+/).filter(Boolean)
  return words.reduce((sum, w) => sum + countSyllables(w.replace(/[^a-zA-Z']/g, '')), 0)
}

// Rough stress pattern per word: returns array of 0/1 per syllable.
// Heuristic: single-syllable content words stressed unless they're function
// words (the, a, of, and, etc). Multi-syllable words: stress first syllable
// by default (covers a strong majority of common English words well enough
// for a visual rhythm guide).
const UNSTRESSED_FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'but', 'to', 'in', 'on', 'at', 'for',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'as', 'so', 'if', 'it',
  'with', 'by', 'from', 'that', 'this', 'than', 'then'
])

export function wordStressPattern(word) {
  const clean = word.replace(/[^a-zA-Z']/g, '').toLowerCase()
  const syl = countSyllables(clean)
  if (syl <= 0) return []
  if (syl === 1) {
    return [UNSTRESSED_FUNCTION_WORDS.has(clean) ? 0 : 1]
  }
  // Multi-syllable: first syllable stressed, rest unstressed (heuristic).
  return Array.from({ length: syl }, (_, i) => (i === 0 ? 1 : 0))
}

export function lineStressPattern(line) {
  const words = line.trim().split(/\s+/).filter(Boolean)
  return words.flatMap((w) => wordStressPattern(w))
}

export function analyzeLine(line) {
  const syllables = countLineSyllables(line)
  const stress = lineStressPattern(line)
  return { text: line, syllables, stress }
}

/**
 * Analyzes a full lyric block (multi-line) and flags lines whose syllable
 * count deviates significantly from the block's median, which is usually
 * what makes a verse "feel clunky" without an obvious reason.
 */
export function analyzeBlock(text) {
  const lines = text.split('\n')
  const analyzed = lines.map(analyzeLine)
  const nonEmpty = analyzed.filter((l) => l.syllables > 0)
  if (nonEmpty.length === 0) return analyzed.map((l) => ({ ...l, deviation: 0 }))

  const counts = nonEmpty.map((l) => l.syllables).sort((a, b) => a - b)
  const mid = Math.floor(counts.length / 2)
  const median = counts.length % 2 !== 0 ? counts[mid] : (counts[mid - 1] + counts[mid]) / 2

  return analyzed.map((l) => ({
    ...l,
    median,
    deviation: l.syllables > 0 ? l.syllables - median : 0
  }))
}

// --- Rhyme helpers -----------------------------------------------------

// Crude phonetic-ish key: strip leading consonant clusters from the final
// vowel onward, normalize common spelling variants. Good enough to group
// perfect/near rhymes for a suggestion list without a full CMU dict lookup.
export function rhymeKey(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return ''
  w = w
    .replace(/ck$/, 'k')
    .replace(/qu/g, 'kw')
    .replace(/ph/g, 'f')
    .replace(/tion$/, 'shun')
    .replace(/sion$/, 'zhun')

  const match = w.match(/[aeiouy]+[^aeiouy]*$/)
  return match ? match[0] : w.slice(-3)
}

export function rhymeScore(a, b) {
  const ka = rhymeKey(a)
  const kb = rhymeKey(b)
  if (!ka || !kb) return 0
  if (ka === kb) return 1
  // Slant rhyme: shares ending consonant sound or vowel sound
  const lenMatch = Math.min(ka.length, kb.length)
  let shared = 0
  for (let i = 1; i <= lenMatch; i++) {
    if (ka.slice(-i) === kb.slice(-i)) shared = i
  }
  return shared / Math.max(ka.length, kb.length)
}
