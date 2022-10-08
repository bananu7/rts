import React from 'react'
import ReactDOM from 'react-dom/client'
import DebugApp from './DebugApp'
import '../index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DebugApp />
  </React.StrictMode>
)