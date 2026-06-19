import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { store } from './lib/storage'
import Layout from './components/Layout.jsx'
import Onboarding from './pages/Onboarding.jsx'
import SoundBible from './pages/SoundBible.jsx'
import Library from './pages/Library.jsx'
import Workspace from './pages/Workspace.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  const [onboarded, setOnboarded] = useState(store.isOnboarded())

  useEffect(() => {
    setOnboarded(store.isOnboarded())
  }, [])

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={<Onboarding onComplete={() => setOnboarded(true)} />}
      />
      <Route element={<Layout />}>
        <Route
          path="/"
          element={onboarded ? <Library /> : <Navigate to="/onboarding" replace />}
        />
        <Route path="/sound-bible" element={<SoundBible />} />
        <Route path="/song/:id" element={<Workspace />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
