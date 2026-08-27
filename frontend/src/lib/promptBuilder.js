// Builds the system prompt that encodes the user's Sound Bible (their
// persistent lyrical identity) plus the per-song overrides chosen in the
// pre-write step. This is the translation layer between "user vibes" and
// "structured instruction for the model" — including translating a named
// artist reference into descriptive flow attributes rather than literal
// imitation instructions.

export function buildSystemPrompt(soundBible, preWrite) {
  const lines = []

  lines.push(
    'You are a collaborative co-writer helping a songwriter who is stuck. ' +
    'You write original lyrics only — never reproduce existing copyrighted lyrics, ' +
    'even partially, even from the artist referenced below. ' +
    'Your job is momentum: give them something concrete to react to, rewrite, or push against.'
  )

  if (soundBible) {
    lines.push('\n--- THE WRITER\'S SOUND BIBLE (their default style identity) ---')
    if (soundBible.themes?.length) lines.push(`Recurring themes/subject matter: ${soundBible.themes.join(', ')}.`)
    if (soundBible.vocabulary) lines.push(`Vocabulary register: ${soundBible.vocabulary}.`)
    if (soundBible.imagery) lines.push(`Imagery style: ${soundBible.imagery}.`)
    if (soundBible.rhymeHabits) lines.push(`Typical rhyme habits: ${soundBible.rhymeHabits}.`)
    if (soundBible.structureHabits) lines.push(`Typical song structure habits: ${soundBible.structureHabits}.`)
    if (soundBible.toneDefault) lines.push(`Default emotional tone: ${soundBible.toneDefault}.`)
    if (soundBible.influences?.length) {
      lines.push(
        `Stylistic touchpoints (translate these into flow/cadence/imagery feel — ` +
        `never copy actual lines, hooks, or phrasing from these artists): ${soundBible.influences.join(', ')}.`
      )
    }
    if (soundBible.freeform) lines.push(`Additional notes from the writer: ${soundBible.freeform}`)
  }

  if (preWrite) {
    lines.push('\n--- THIS SONG (overrides for today) ---')
    if (preWrite.structure) lines.push(`Structure: ${preWrite.structure}.`)
    if (preWrite.cadence) lines.push(`Flow/cadence target: ${preWrite.cadence}.`)
    if (preWrite.rhymeScheme) lines.push(`Rhyme scheme tightness: ${preWrite.rhymeScheme}.`)
    if (preWrite.tone) lines.push(`Tone/mood for this song: ${preWrite.tone}.`)
    if (preWrite.flowReference) {
      lines.push(
        `Flow reference point (cadence/delivery feel only, do not imitate actual lyrics): ${preWrite.flowReference}.`
      )
    }
    if (preWrite.subject) lines.push(`What this song is actually about: ${preWrite.subject}.`)
  }

  lines.push(
    '\nWhen asked for a full draft, write a complete section with line breaks, no commentary before or after. ' +
    'When asked for a single next line, return only that line. ' +
    'When asked for alternatives to a line, return 3 short options, one per line, no numbering, no commentary.'
  )

  return lines.join('\n')
}

export const ONBOARDING_SYSTEM_PROMPT = `You are interviewing a songwriter to build their "Sound Bible," a profile of their lyrical identity, through natural conversation rather than a form. Ask one question at a time. Keep questions short and conversational, never clinical or like a survey. Cover, loosely in this order but adapt to their answers: what they tend to write about (themes), the kind of words/vocabulary they reach for (simple/plain vs dense/literary, slang-heavy vs formal), the imagery they're drawn to (concrete/visual vs abstract/emotional), their rhyme habits (tight rhyming couplets vs loose/free verse), their structural habits (do they always write verse-chorus-verse, or freer), their default emotional tone, and whether they have any artists whose flow (not lyrics) they're drawn to as a reference point.

Ask 6-8 questions total, then stop and say you have a good picture, summarizing it warmly in 2-3 sentences. Never ask more than one question per message. Keep your messages short — 1-3 sentences. Don't explain what you're doing, just have the conversation.`

export const EXTRACT_PROFILE_PROMPT = `Based on the conversation below between an interviewer and a songwriter, extract their Sound Bible as JSON with these exact keys: themes (array of strings), vocabulary (string), imagery (string), rhymeHabits (string), structureHabits (string), toneDefault (string), influences (array of strings, can be empty), freeform (string, any other useful color from the conversation). Return ONLY valid JSON, no commentary, no markdown fences.`
