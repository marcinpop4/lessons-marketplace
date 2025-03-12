import { useState } from 'react'
// Import directly to remove dependency on SVG file
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        {/* Removed logo images temporarily */}
      </div>
      <h1>Arts Marketplace</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>frontend/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Welcome to the Arts Marketplace project
      </p>
    </>
  )
}

export default App
