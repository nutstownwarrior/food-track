import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-expect-error css import
import './index.css'
import App from './App'
import { LanguageProvider } from './lib/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
)
