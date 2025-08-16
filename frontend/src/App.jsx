import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Signup from './pages/signup.jsx'
import React from 'react'

function App() {
  return (
    <BrowserRouter>
      <nav className="bg-gradient-to-r from-indigo-900 via-gray-900 to-black p-4 flex justify-center shadow-lg">
        <Link
          to="/signup"
          className="text-indigo-200 font-semibold px-6 py-2 rounded-xl hover:bg-indigo-700 hover:text-white transition-all duration-200 shadow-md"
        >
          Signup
        </Link>
      </nav>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-black">
        <Routes>
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
