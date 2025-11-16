import { Route, BrowserRouter, Routes } from 'react-router-dom'
import HeroSection from './components/Hero'
import { DataViewer } from './components/DataViewer'
import NotFound from './components/NotFound'
import Layout from './components/Layout'

function App() {
  return (
    <>
      <div className="absolute top-0 z-[-2] h-screen w-screen bg-neutral-50 bg-[radial-gradient(100%_50%_at_50%_0%,rgba(0,163,255,0.13)_0,rgba(0,163,255,0)_50%,rgba(0,163,255,0)_100%)]"></div>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Layout />}>
            <Route index element={<HeroSection />} />
            <Route path=':id' element={<DataViewer />} />
          </Route>
          <Route path='*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
