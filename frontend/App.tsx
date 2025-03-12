import React, { useState } from 'react'
import LessonRequestForm from './components/LessonRequestForm'
// Import directly to remove dependency on SVG file
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="header">
        <h1>Arts Marketplace</h1>
      </div>
      
      <div className="main-content">
        <LessonRequestForm />
      </div>
      
      <div className="footer">
        <p className="read-the-docs">
          Welcome to the Arts Marketplace project
        </p>
      </div>
    </>
  )
}

export default App
