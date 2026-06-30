import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorToastProvider } from './context/ErrorToastContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorToastProvider>
      <App />
    </ErrorToastProvider>
  </StrictMode>,
)
