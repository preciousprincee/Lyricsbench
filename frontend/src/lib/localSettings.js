const KEY = 'lyricbench:model-preference'

// Kept in sync with backend GROQ_ALLOWED_MODELS (config/settings.py).
// Groq deprecated llama-3.3-70b-versatile / llama-3.1-8b-instant to
// enterprise-only in June 2026 — these are the current developer-tier
// production models as of Aug 2026. Check console.groq.com/docs/models
// before changing.
const AVAILABLE_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B — best quality (default)' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B — fastest' }
]

export function getAvailableModels() {
  return AVAILABLE_MODELS
}

export function getModelPreference() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && AVAILABLE_MODELS.some((m) => m.id === saved)) return saved
    return AVAILABLE_MODELS[0].id
  } catch {
    return AVAILABLE_MODELS[0].id
  }
}

export function setModelPreference(modelId) {
  try {
    localStorage.setItem(KEY, modelId)
  } catch {
    // ignore — non-critical UI preference
  }
}
