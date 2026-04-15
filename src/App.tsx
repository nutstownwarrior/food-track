import { useState } from 'react'
import TodayScreen from './screens/TodayScreen'
import LogFoodScreen from './screens/LogFoodScreen'
import CameraScreen from './screens/CameraScreen'
import HistoryScreen from './screens/HistoryScreen'
import SettingsScreen from './screens/SettingsScreen'
import BottomNav from './components/BottomNav'

export type Screen = 'today' | 'log' | 'camera' | 'history' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('today')
  const [logDate, setLogDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

  function navigate(s: Screen, date?: string) {
    if (date) setLogDate(date)
    setScreen(s)
  }

  return (
    <div className="flex flex-col h-dvh max-w-lg mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        {screen === 'today'    && <TodayScreen   navigate={navigate} />}
        {screen === 'log'      && <LogFoodScreen  date={logDate} onDone={() => navigate('today')} />}
        {screen === 'camera'   && <CameraScreen   onDone={() => navigate('today')} />}
        {screen === 'history'  && <HistoryScreen  navigate={navigate} />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav current={screen} navigate={navigate} />
    </div>
  )
}
