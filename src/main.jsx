import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Official from './Official.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Official />
  </StrictMode>,
)
