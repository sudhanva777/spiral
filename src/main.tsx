import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ---------------------------------------------------------------------------
// Global error capture (diagnostic — production console visibility)
// ---------------------------------------------------------------------------
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error ?? event.message, event.filename ?? '', event.lineno ?? '');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED PROMISE]', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
