import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'

// Configure backend providers before rendering
import { configureBackend } from './providers/backend/registry.js'
import { firebaseAuthProvider } from './providers/backend/firebase/firebaseAuthProvider.js'
import { firebaseUserProvider } from './providers/backend/firebase/firebaseUserProvider.js'
import { firebaseAuditProvider } from './providers/backend/firebase/firebaseAuditProvider.js'
import { localStorageProjectProvider } from './providers/backend/firebase/firebaseProjectProvider.js'

configureBackend({
  auth: firebaseAuthProvider,
  user: firebaseUserProvider,
  project: localStorageProjectProvider,
  audit: firebaseAuditProvider,
})

// Enable E2E mock auth bypass in dev environment
if (import.meta.env.DEV) {
  localStorage.setItem('e2e-mock-auth', 'true')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
