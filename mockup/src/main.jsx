import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CharacterGeneratorMockup from './character-generator-mockup.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CharacterGeneratorMockup />
  </StrictMode>,
)
