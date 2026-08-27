import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { store } from './lib/storage'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Onboarding from './pages/Onboarding.jsx'
import SoundBible from './pages/SoundBible.jsx'
import Library from './pages/Library.jsx'
import Workspace from './pages/Workspace.jsx'
import Settings from './pages/Settings.jsx'

/** Gate that only lets onboarded users see the main app; sends everyone
 *  else to /onboarding. Sits inside ProtectedRoute, so we already know
 *  the user is signed in by the time this runs. */
function OnboardingGate() {
  const [status, setStatus] = useState('checking') // 'checking' | 'onboarded' | 'pending'

  useEffect(() => {
    let cancelled = false
    store.isOnboarded()
      .then((done) => { if (!cancelled) setStatus(done ? 'onboarded' : 'pending') })
      .catch(() => { if (!cancelled) setStatus('pending') })
    return () => { cancelled = true }
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-ink-soft text-sm">
        Loading your Sound Bible…
      </div>
    )
  }
  if (status === 'pending') return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function AppRoutes() {
  const [justOnboarded, setJustOnboarded] = useState(false)

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/onboarding"
          element={<Onboarding onComplete={() => setJustOnboarded(true)} />}
        />

        <Route element={justOnboarded ? <Outlet /> : <OnboardingGate />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Library />} />
            <Route path="/sound-bible" element={<SoundBible />} />
            <Route path="/song/:id" element={<Workspace />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
