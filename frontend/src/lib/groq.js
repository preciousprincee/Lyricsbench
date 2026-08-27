// This module keeps its original name/exports so existing call sites
// (Onboarding, Workspace, RhymePanel) don't need to change their imports —
// but under the hood it now calls our own Django backend, which holds the
// real Groq API key server-side and enforces per-plan monthly quotas.
import { api, ApiError } from './apiClient'
import { getModelPreference } from './localSettings'

export class GroqError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'GroqError'
    this.status = status
    this.code = code
  }
}

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ temperature?: number, maxTokens?: number, jsonMode?: boolean, purpose?: string }} opts
 */
export async function groqChat(messages, opts = {}) {
  try {
    const data = await api.post('/ai/chat/', {
      messages,
      purpose: opts.purpose || 'other',
      model: getModelPreference(),
      temperature: opts.temperature ?? 0.9,
      max_tokens: opts.maxTokens ?? 1200,
      json_mode: !!opts.jsonMode
    })
    return opts.jsonMode ? data : data.text
  } catch (err) {
    if (err instanceof ApiError) {
      throw new GroqError(err.message, err.status, err.code)
    }
    throw new GroqError('Something went wrong talking to the AI. Try again.', 0)
  }
}

export async function groqJSON(messages, opts = {}) {
  const data = await groqChat(messages, { ...opts, jsonMode: true })
  if (data.json) return data.json
  try {
    const cleaned = String(data.text || '').replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new GroqError('The AI returned malformed data. Try again.', 500)
  }
}
