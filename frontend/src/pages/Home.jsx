/* ----------------------------- src/pages/Home.jsx ----------------------------- */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession, useUser, useDescope } from '@descope/react-sdk';
import ConnectPanel from '../components/ConnectPanel';

export default function Home() {
  const { isAuthenticated } = useSession();
  const { user } = useUser();
  const { logout } = useDescope();

  const [showProfile, setShowProfile] = useState(false);
  const [connectedMap, setConnectedMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('connectedMap_v2') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    function onStorage() {
      try {
        setConnectedMap(JSON.parse(localStorage.getItem('connectedMap_v2') || '{}'));
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isGithubConnected = connectedMap.github === 'connected' || connectedMap.github === 'pending';

  function handleScanRepos() {
    window.location.href = '/github-details';
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
      {/* top navigation */}
      <header className="w-full border-b border-gray-800/60 bg-gradient-to-b from-transparent to-black/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-700 to-pink-600 text-white font-bold">FC</div>
            <div>
              <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
                <div className="text-sm font-semibold">FutureCommit</div>
                <div className="text-xs text-gray-400">Commit to your growth, not just your code.</div>
              </motion.div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="text-sm text-gray-300 mr-2 hidden sm:block">{user?.name ?? user?.email}</div>
                <button onClick={() => setShowProfile(true)} className="px-3 py-1.5 rounded-md bg-gray-800/50 border border-gray-700 text-sm">Profile</button>
                <button onClick={() => logout()} className="px-3 py-1.5 rounded-md bg-red-700/10 border border-red-700 text-sm text-red-300">Sign out</button>
              </>
            ) : (
              <div className="text-sm text-gray-400">Not signed in</div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Animated hero */}
        <section>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="rounded-2xl overflow-hidden border border-gray-800/60 p-6 shadow-xl relative bg-gradient-to-br from-gray-900/60 to-gray-800/60">
            <div className="absolute inset-0 -z-10 hero-animated-bg" aria-hidden />

            <div className="flex items-start justify-between gap-6">
              <div>
                <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.6 }} className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-indigo-400 to-cyan-300">FutureCommit</motion.h1>

                <motion.p initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="mt-3 text-sm text-gray-300 max-w-xl">Commit to your growth, not just your code. Connect GitHub to get project-aware learning, schedule focused practice, share updates, and land opportunities — all from one place.</motion.p>

                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.5 }} className="mt-6">
                  <button onClick={handleScanRepos} className="px-4 py-2 rounded-md bg-sky-600/20 border border-sky-600 text-sky-200 text-sm">Scan GitHub</button>
                </motion.div>
              </div>

              <div className="hidden md:block w-72">
                <motion.div initial={{ rotateY: 20, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/50">
                  <div className="text-xs text-gray-400">Quick status</div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm"><div>GitHub</div><div className="text-emerald-200">{isGithubConnected ? 'Connected' : 'Not connected'}</div></div>
                    <div className="flex items-center justify-between text-sm"><div>Youtube</div><div className="text-emerald-200">{connectedMap.youtube ? 'Connected' : 'Not connected'}</div></div>
                    <div className="flex items-center justify-between text-sm"><div>Google</div><div className="text-emerald-200">{connectedMap.google ? 'Connected' : 'Not connected'}</div></div>
                    <div className="flex items-center justify-between text-sm"><div>Notion</div><div className="text-emerald-200">{connectedMap.notion ? 'Connected' : 'Not connected'}</div></div>
                    <div className="flex items-center justify-between text-sm"><div>Spotify</div><div className="text-emerald-200">{connectedMap.spotify ? 'Connected' : 'Not connected'}</div></div>
                    <div className="flex items-center justify-between text-sm"><div>Slack</div><div className="text-emerald-200">{connectedMap.slack ? 'Connected' : 'Not connected'}</div></div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Full-width ConnectPanel at the TOP (horizontal layout) */}
        <div>
          <ConnectPanel layout="horizontal" />
        </div>

        {/* Auth gated workspace (kept minimal) */}
        {isAuthenticated ? (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <section>
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="rounded-2xl bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-gray-800/60 p-6 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-600 to-pink-600 text-white font-bold">Work</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-100">Your workspace</h3>
                    <p className="text-xs text-gray-400 mt-1">Open the Launchpad actions above to begin — the Connect panel below helps you hook up services.</p>
                  </div>
                </div>
              </motion.div>
            </section>
          </div>
        ) : (
          <div className="min-h-[40vh] flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl p-8 bg-gray-900/70 border border-gray-800/60 max-w-lg text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-700 to-pink-600 flex items-center justify-center text-white font-bold text-2xl mb-4">FC</div>
              <h2 className="text-xl font-semibold text-gray-100">Welcome</h2>
              <p className="text-sm text-gray-400 mt-2">Create an account to get started — secure authentication powered by Descope.</p>
            </motion.div>
          </div>
        )}
      </main>

      {/* Footer / back to top */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-right">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-4 py-2 rounded-md bg-sky-600/20 border border-sky-600 text-sky-200 text-sm">Back to top</button>
      </div>

      {/* animated background styles */}
      <style jsx>{`
        .hero-animated-bg {
          background: linear-gradient(120deg, rgba(99,102,241,0.07), rgba(236,72,153,0.04), rgba(6,182,212,0.04));
          background-size: 300% 300%;
          animation: gradientShift 8s ease infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}