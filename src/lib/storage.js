const KEYS = {
  SOUND_BIBLE: 'lyricbench:sound-bible',
  SONGS: 'lyricbench:songs',
  SETTINGS: 'lyricbench:settings',
  ONBOARDED: 'lyricbench:onboarded'
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const store = {
  getSoundBible: () => read(KEYS.SOUND_BIBLE, null),
  setSoundBible: (bible) => write(KEYS.SOUND_BIBLE, bible),

  getSongs: () => read(KEYS.SONGS, []),
  setSongs: (songs) => write(KEYS.SONGS, songs),
  getSong: (id) => read(KEYS.SONGS, []).find((s) => s.id === id) || null,
  saveSong: (song) => {
    const songs = read(KEYS.SONGS, [])
    const idx = songs.findIndex((s) => s.id === song.id)
    if (idx >= 0) songs[idx] = song
    else songs.unshift(song)
    write(KEYS.SONGS, songs)
    return song
  },
  deleteSong: (id) => {
    const songs = read(KEYS.SONGS, []).filter((s) => s.id !== id)
    write(KEYS.SONGS, songs)
  },

  getSettings: () => read(KEYS.SETTINGS, { groqApiKey: '', groqModel: 'llama-3.3-70b-versatile' }),
  setSettings: (settings) => write(KEYS.SETTINGS, settings),

  isOnboarded: () => read(KEYS.ONBOARDED, false),
  setOnboarded: (val) => write(KEYS.ONBOARDED, val)
}

export const STORAGE_KEYS = KEYS
