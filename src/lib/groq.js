import { store } from './storage'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export class GroqError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'GroqError'
    this.status = status
  }
}

/**
 * Calls the Groq chat completions endpoint.
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ temperature?: number, maxTokens?: number, jsonMode?: boolean }} opts
 */
export async function groqChat(messages, opts = {}) {
  const settings = store.getSettings()
  const apiKey = settings.groqApiKey?.trim()

  if (!apiKey) {
    throw new GroqError('No Groq API key set. Add one in Settings to start writing.', 401)
  }

  const body = {
    model: settings.groqModel || 'llama-3.3-70b-versatile',
    messages,
    temperature: opts.temperature ?? 0.9,
    max_tokens: opts.maxTokens ?? 1200
  }

  if (opts.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  let res
  try {
    res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    })
  } catch (err) {
    throw new GroqError('Could not reach Groq. Check your connection and try again.', 0)
  }

  if (!res.ok) {
    let detail = ''
    try {
      const errJson = await res.json()
      detail = errJson?.error?.message || ''
    } catch {
      // ignore parse failure
    }
    if (res.status === 401) {
      throw new GroqError('That API key was rejected. Double check it in Settings.', 401)
    }
    if (res.status === 429) {
      throw new GroqError('Groq is rate-limiting this key right now. Wait a moment and try again.', 429)
    }
    throw new GroqError(detail || `Groq request failed (${res.status}).`, res.status)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) {
    throw new GroqError('Groq returned an empty response. Try again.', 500)
  }
  return text
}

export async function groqJSON(messages, opts = {}) {
  const text = await groqChat(messages, { ...opts, jsonMode: true })
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new GroqError('Groq returned malformed data. Try again.', 500)
  }
}

export async function testGroqKey(apiKey) {
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say "ok".' }],
        max_tokens: 5
      })
    })
    return res.ok
  } catch {
    return false
  }
}
