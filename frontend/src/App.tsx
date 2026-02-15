import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import { Sidebar } from './components/Sidebar'
import { AEPAnalysis } from './pages/AEPAnalysis'
import { Dashboard } from './pages/Dashboard'
import { DataExplorer } from './pages/DataExplorer'
import { LossesAnalysis } from './pages/LossesAnalysis'
import { PowerCurves } from './pages/PowerCurves'
import { YawAnalysis } from './pages/YawAnalysis'

function RouteShell({ children }: { children: React.ReactNode }) {
  return <div className="route-shell">{children}</div>
}

export default function App() {
  const location = useLocation()

  return (
    <div className="app-root">
      <div className="bg-mesh" />
      <Sidebar />

      <main className="main-layout">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <RouteShell>
                  <Dashboard />
                </RouteShell>
              }
            />
            <Route
              path="/data"
              element={
                <RouteShell>
                  <DataExplorer />
                </RouteShell>
              }
            />
            <Route
              path="/power-curves"
              element={
                <RouteShell>
                  <PowerCurves />
                </RouteShell>
              }
            />
            <Route
              path="/aep"
              element={
                <RouteShell>
                  <AEPAnalysis />
                </RouteShell>
              }
            />
            <Route
              path="/losses"
              element={
                <RouteShell>
                  <LossesAnalysis />
                </RouteShell>
              }
            />
            <Route
              path="/yaw"
              element={
                <RouteShell>
                  <YawAnalysis />
                </RouteShell>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}
