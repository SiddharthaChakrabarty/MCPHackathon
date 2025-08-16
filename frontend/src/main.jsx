import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DescopeProvider } from '@descope/react-sdk'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DescopeProvider
      projectId="prodigious-mustard-fermi" // Replace with your actual Project ID
    >
      <App />
    </DescopeProvider>
  </StrictMode>,
)
