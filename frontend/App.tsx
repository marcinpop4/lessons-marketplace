import React, { useState } from 'react'
import LessonRequestForm from './components/LessonRequestForm'
import TeacherQuotes from './components/TeacherQuotes'
// Import directly to remove dependency on SVG file
import './App.css'

function App() {
  // State to track the current screen
  const [currentScreen, setCurrentScreen] = useState<'lessonRequestForm' | 'teacherQuotes'>('lessonRequestForm')
  // State to store the created lesson request ID
  const [lessonRequestId, setLessonRequestId] = useState<string | null>(null)

  // Function to handle lesson request submission
  const handleLessonRequestSubmit = (id: string) => {
    setLessonRequestId(id)
    setCurrentScreen('teacherQuotes')
  }

  // Function to go back to the lesson request form
  const handleGoBack = () => {
    setCurrentScreen('lessonRequestForm')
  }

  return (
    <>
      <div className="header">
        <h1>Arts Marketplace</h1>
      </div>
      
      <div className="main-content">
        {currentScreen === 'lessonRequestForm' ? (
          <LessonRequestForm onSubmitSuccess={handleLessonRequestSubmit} />
        ) : currentScreen === 'teacherQuotes' && lessonRequestId ? (
          <TeacherQuotes lessonRequestId={lessonRequestId} onBack={handleGoBack} />
        ) : (
          // Fallback if something unexpected happens
          <div>
            <p>Something went wrong. Please try again.</p>
            <button onClick={handleGoBack}>Go Back</button>
          </div>
        )}
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
