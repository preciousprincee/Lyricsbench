import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { store } from '../lib/storage'

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Library() {
  const navigate = useNavigate()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    store.getSongs()
      .then((s) => { if (!cancelled) setSongs(s) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function newSong() {
    if (creating) return
    setCreating(true)
    const id = crypto.randomUUID()
    const song = {
      id,
      title: 'Untitled',
      lyrics: '',
      preWrite: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    try {
      await store.saveSong(song)
      navigate(`/song/${id}`)
    } finally {
      setCreating(false)
    }
  }

  async function deleteSong(id) {
    await store.deleteSong(id)
    setSongs(await store.getSongs())
    setDeleting(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-rust mb-2">Your songs</p>
          <h1 className="font-display text-3xl sm:text-4xl italic">Library</h1>
        </div>
        <button
          onClick={newSong}
          disabled={creating}
          className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm tracking-wide hover:bg-rust transition-colors disabled:opacity-50"
        >
          + New song
        </button>
      </div>

      {loading ? (
        <p className="text-ink-soft text-sm">Loading your library…</p>
      ) : songs.length === 0 ? (
        <div className="border border-dashed border-rule rounded-sm py-20 text-center">
          <p className="font-display text-2xl italic text-ink-soft mb-3">Nothing here yet.</p>
          <p className="text-sm text-ink-soft mb-6">Start a new song to open the workspace.</p>
          <button
            onClick={newSong}
            className="border border-ink text-sm px-5 py-2.5 rounded-sm hover:bg-ink hover:text-paper transition-colors"
          >
            Start writing
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {songs.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-3 group"
            >
              <button
                onClick={() => navigate(`/song/${song.id}`)}
                className="flex-1 text-left border border-rule hover:border-ink rounded-sm px-5 py-4 transition-colors"
              >
                <span className="block font-medium text-sm mb-1 group-hover:text-rust transition-colors">
                  {song.title || 'Untitled'}
                </span>
                <span className="block text-xs text-ink-soft">
                  {formatDate(song.updatedAt)}
                  {song.lyrics ? ` · ${song.lyrics.split('\n').filter(Boolean).length} lines` : ''}
                </span>
              </button>
              {deleting === song.id ? (
                <div className="flex gap-2 text-xs">
                  <button onClick={() => deleteSong(song.id)} className="text-rust hover:underline">Delete</button>
                  <button onClick={() => setDeleting(null)} className="text-ink-soft hover:underline">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleting(song.id)}
                  className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-ink-soft hover:text-rust transition-all"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
