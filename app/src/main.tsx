import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './hooks/useTheme' // Initialize theme before render (prevents flash)
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Check for updates every 30 minutes
      setInterval(() => reg.update(), 30 * 60 * 1000);
    }).catch(() => {});
  });
}
