import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AuthProvider,
  Descope,
  useSession,
  useUser,
  useDescope,
} from "@descope/react-sdk";

const projectId = "P31EeCcDPtwQGyi9wbZk4ZLKKE5a";

// Helper to get initials from name or email
function getInitials(name, email) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
}

function AuthenticatedAppContent() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const { user, isUserLoading } = useUser();

  if (isSessionLoading || isUserLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-gray-400"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  // Authenticated view: just a welcome message
  if (isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl w-full bg-gradient-to-br from-white/3 to-white/6 backdrop-blur rounded-3xl p-8 border border-white/6 shadow-2xl"
        >
          <h3 className="text-2xl font-semibold text-white">
            Welcome, {user?.name || user?.email}
          </h3>
          <p className="text-sm text-gray-300">{user?.email}</p>
        </motion.div>
      </div>
    );
  }

  // Unauthenticated view: just a welcome message
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-lg w-full bg-gradient-to-br from-white/6 via-white/4 to-transparent backdrop-blur-md border border-white/6 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
            DS
          </div>
          <h2 className="text-2xl font-semibold text-white">Welcome</h2>
          <p className="text-sm text-gray-300 text-center">
            Create an account to get started — fast, secure authentication powered by Descope.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useSession();
  const { user } = useUser();
  const { logout } = useDescope();

  const [showFlow, setShowFlow] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [authChanged, setAuthChanged] = useState(false); // Add this

  // When auth changes, force re-render
  React.useEffect(() => {
    setAuthChanged((prev) => !prev);
  }, [isAuthenticated]);

  return (
    // Remove <AuthProvider> here if you move it to main.jsx
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_#0b0b0b,_#050505)] text-white relative">
      {/* decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute -right-40 -top-28 opacity-20" width="600" height="600" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="200" fill="url(#g1)" />
        </svg>

        <svg className="absolute -left-40 bottom-0 opacity-10" width="500" height="500" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="250" cy="250" r="200" fill="#06b6d4" />
        </svg>
      </div>

      <header className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white">DS</div>
            <div>
              <h1 className="text-lg font-semibold">Descope Demo</h1>
              <p className="text-xs text-gray-400">Beautiful dark authentication UI</p>
            </div>
          </div>
          {/* Navbar controls */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <button
                onClick={() => setShowFlow("sign-up-or-in")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow-lg hover:scale-[1.01] active:scale-95 transition-transform"
              >
                Sign up / Sign in
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowProfile(true)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-sm border-2 border-white/10 hover:scale-105 transition"
                  aria-label="Profile"
                >
                  {getInitials(user?.name, user?.email)}
                </button>
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-95 transition-transform"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <AuthenticatedAppContent />
      </main>

      <footer className="relative z-10 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-gray-500">
          Built with ♥ — Descope & TailwindCSS
        </div>
      </footer>

      {/* Auth modal */}
      {showFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFlow(null)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 w-full max-w-md bg-gradient-to-br from-white/3 to-white/6 rounded-2xl p-5 border border-white/6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Sign up / Sign in</h3>
              <button
                onClick={() => setShowFlow(null)}
                className="text-gray-300 hover:text-white text-sm"
                aria-label="Close auth"
              >
                Close
              </button>
            </div>

            <div className="rounded-lg overflow-hidden bg-black/60 p-2">
              <Descope
                flowId={showFlow}
                theme="dark"
                onSuccess={() => {
                  setShowFlow(null);
                  setAuthChanged((prev) => !prev); // Force re-render
                }}
                onError={(e) => console.error("Login failed:", e)}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfile(false)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 w-full max-w-md bg-gradient-to-br from-white/3 to-white/6 rounded-2xl p-5 border border-white/6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="text-gray-300 hover:text-white text-sm"
                aria-label="Close profile"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <span className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-2xl">
                {getInitials(user?.name, user?.email)}
              </span>
              <p className="text-lg font-semibold text-white">{user?.name || user?.email}</p>
              <p className="text-sm text-gray-300">{user?.email}</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
