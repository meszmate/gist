import { Route, BrowserRouter, Routes } from 'react-router-dom'
import { DataViewer } from './components/DataViewer'
import NotFound from './components/NotFound'
import Layout from './components/Layout'
import { Toaster } from 'react-hot-toast'
import { Landing } from './pages/Landing'
import { Create } from './pages/Create'
import { Dashboard } from './pages/Dashboard'
import { Library } from './pages/Library'
import { StudySession } from './pages/StudySession'
import { Settings } from './pages/Settings'
import { ProtectedRoute } from './hooks/useAuth'
import { PomodoroTimer } from './components/timer/PomodoroTimer'

function App() {
  return (
    <>
      <div className="absolute top-0 z-[-2] min-h-screen w-screen bg-neutral-50 dark:bg-neutral-950 bg-[radial-gradient(100%_50%_at_50%_0%,rgba(0,163,255,0.13)_0,rgba(0,163,255,0)_50%,rgba(0,163,255,0)_100%)] dark:bg-[radial-gradient(100%_50%_at_50%_0%,rgba(99,102,241,0.15)_0,rgba(99,102,241,0)_50%,rgba(99,102,241,0)_100%)]"></div>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path='create' element={
              <ProtectedRoute>
                <Create />
              </ProtectedRoute>
            } />
            <Route path='dashboard' element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path='library' element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            } />
            <Route path='study' element={
              <ProtectedRoute>
                <StudySession />
              </ProtectedRoute>
            } />
            <Route path='study/:materialId' element={
              <ProtectedRoute>
                <StudySession />
              </ProtectedRoute>
            } />
            <Route path='settings' element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path='shared/:token' element={<DataViewer />} />
            <Route path=':id' element={<DataViewer />} />
          </Route>
          <Route path='*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-neutral-800 dark:text-white',
        }}
      />
      <PomodoroTimer />
    </>
  )
}

export default App
