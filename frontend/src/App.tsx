import { BrowserRouter, Routes, Route} from 'react-router-dom'
import ReportIndex from './pages/ReportIndex.tsx'
import ReportView from './pages/ReportView.tsx'
import ReportCreate from './pages/ReportCreate.tsx'
import GameIndex from './pages/GameIndex.tsx'

function App() {

  return (
    <BrowserRouter>
    <Routes>
      <Route path="/reports" element={<ReportIndex />} />
      <Route path="/reports/:id" element={<ReportView />} />
      <Route path="/reports/create" element={<ReportCreate />} />
      <Route path="/games" element={<GameIndex />} />
    </Routes>
    </BrowserRouter>
  )
}

export default App