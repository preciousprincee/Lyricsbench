// Same exported shape as the original localStorage-backed module (so pages
// changed as little as possible), but every method now talks to the Django
// API and is async — data lives in Django's database per-account instead of
// in the browser.
import { api } from './apiClient'

export const store = {
  getSoundBible: () => api.get('/sound-bible/'),
  setSoundBible: (bible) => api.put('/sound-bible/', bible),

  getSongs: () => api.get('/songs/').then((res) => res.results ?? res),
  getSong: (id) => api.get(`/songs/${id}/`),
  saveSong: (song) => api.post('/songs/', song),
  deleteSong: (id) => api.del(`/songs/${id}/`),

  isOnboarded: async () => {
    const bible = await api.get('/sound-bible/')
    return !!bible?.onboarded
  },
  setOnboarded: (val) => api.patch('/sound-bible/', { onboarded: val })
}
