import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ReportIndex from './pages/ReportIndex'
import ReportView from './pages/ReportView'
import ReportCreate from './pages/ReportCreate'
import GameIndex from './pages/GameIndex'
import GameView from './pages/GameView'
import Practice from './pages/GameLobby'
import Login from './pages/Login'
import Register from './pages/Register'
import ConfirmEmail from './pages/ConfirmEmail'


function App() {
    return (
        <BrowserRouter>
            <Routes>
            {/*If you ever need a page **without** the navbar (e.g. a fullscreen
              game board), put that route ***outside*** the layout route:  

              <Routes>
                  <Route element={<Layout />}
                      //these pages get the navbar
                  </Route>
                  <Route path="/fullscreen/:id" element={<FullscreenGame />
                      //this page does NOT get the navbar
              </Routes>
            */}
                <Route element={<Navbar />}>
                    <Route path="/" element={<Navigate to="/reports" replace />} />
                    <Route path="/reports" element={<ReportIndex />} />
                    <Route path="/reports/:id" element={<ReportView />} />
                    <Route path="/reports/create" element={<ReportCreate />} />
                    <Route path="/games" element={<GameIndex />} />
                    <Route path="/games/:id" element={<GameView />} />
                    <Route path="/practice" element={<Practice />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/confirm-email/:key/" element={<ConfirmEmail />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App