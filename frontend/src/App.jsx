import { useState } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import FoodLog from './components/FoodLog'
import Profile from './components/Profile'
import Goals from './components/Goals'

const TABS = [
  { id: 'dashboard', label: 'Übersicht', icon: '📊' },
  { id: 'food', label: 'Tagebuch', icon: '🥗' },
  { id: 'profile', label: 'Profil', icon: '👤' },
  { id: 'goals', label: 'Ziele', icon: '🎯' },
]

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [authMode, setAuthMode] = useState('login')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userGoals, setUserGoals] = useState(null)

  function handleLogin(newToken, newUsername) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('username', newUsername)
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setToken(null)
  }

  if (!token) {
    return authMode === 'login'
      ? <Login onLogin={handleLogin} onSwitch={() => setAuthMode('register')} />
      : <Register onLogin={handleLogin} onSwitch={() => setAuthMode('login')} />
  }

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white shadow-sm relative">
      {/* Header */}
      <header className="bg-green-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold tracking-tight">🥦 KaloTrack</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-green-100 hover:text-white transition-colors"
        >
          Abmelden
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard' && <Dashboard onGoalsLoad={setUserGoals} />}
        {activeTab === 'food' && <FoodLog goals={userGoals} />}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'goals' && <Goals onGoalsUpdate={setUserGoals} />}
      </main>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              activeTab === tab.id ? 'text-green-600 font-semibold' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
