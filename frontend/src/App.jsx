import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Signup from './pages/signup.jsx'
import React from 'react'

function App() {
  return (
    <BrowserRouter>
      <nav className="bg-neutral-950 border-b border-neutral-800 px-6 py-4 flex justify-center">
        <Link
          to="/signup"
          className="text-gray-100 font-semibold px-6 py-2 rounded-lg hover:bg-neutral-900 transition"
        >
          Signup
        </Link>
      </nav>
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <Routes>
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
