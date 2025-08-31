// FILE: src/pages/RepoRouter.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useUser, useSession } from "@descope/react-sdk";


const RepoContext = createContext(null);
export const useRepo = () => useContext(RepoContext);

export default function RepoRouter() {
  const { repoName } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAuthenticated } = useSession();

  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!repoName || !user?.userId) return;

    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("https://mcp-hackathon-7buc.vercel.app/api/github/repo/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId: user.userId, repoName }),
        });
        if (!res.ok) throw new Error(`Server ${res.status}`);
        const d = await res.json();
        if (mounted) setDetails(d);
      } catch (e) {
        console.error(e);
        if (mounted) setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [isAuthenticated, user, repoName]);

  // If user isn't authenticated, redirect to main repo list
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/github-details");
    }
  }, [isAuthenticated, navigate]);

  return (
    <RepoContext.Provider value={{ details, setDetails, loading, error, repoName }}>
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
        <header className="w-full border-b border-gray-800/60 bg-gradient-to-b from-transparent to-black/40 backdrop-blur sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-700 to-pink-600 text-white font-bold">FC</div>
              <div>
                <div className="text-sm font-semibold">FutureCommit</div>
                <div className="text-xs text-gray-400">Repo • {repoName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-md bg-gray-800/50 border border-gray-700 text-sm">← Back</button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-2xl overflow-hidden border border-gray-800/60 p-6 shadow-xl relative bg-gradient-to-br from-gray-900/60 to-gray-800/60 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <motion.h1 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }} className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-indigo-400 to-cyan-300">{repoName}</motion.h1>
                <div className="text-xs text-gray-400">Manage repo details, invites, commit history, and learning resources in focused views.</div>
              </div>

              <nav className="flex gap-2">
                <NavLink to={`/repo/${repoName}/overview`} className={({ isActive }) => `px-3 py-1 rounded-md text-sm ${isActive ? 'bg-sky-600/20 border border-sky-600 text-sky-200' : 'bg-gray-800/30 border border-gray-700 text-gray-200'}`}>
                  Overview
                </NavLink>
                <NavLink to={`/repo/${repoName}/commits`} className={({ isActive }) => `px-3 py-1 rounded-md text-sm ${isActive ? 'bg-sky-600/20 border border-sky-600 text-sky-200' : 'bg-gray-800/30 border border-gray-700 text-gray-200'}`}>
                  Commits
                </NavLink>
                <NavLink to={`/repo/${repoName}/meet`} className={({ isActive }) => `px-3 py-1 rounded-md text-sm ${isActive ? 'bg-sky-600/20 border border-sky-600 text-sky-200' : 'bg-gray-800/30 border border-gray-700 text-gray-200'}`}>
                  Meet
                </NavLink>
                <NavLink to={`/repo/${repoName}/recommendations`} className={({ isActive }) => `px-3 py-1 rounded-md text-sm ${isActive ? 'bg-sky-600/20 border border-sky-600 text-sky-200' : 'bg-gray-800/30 border border-gray-700 text-gray-200'}`}>
                  Recommendations
                </NavLink>
                <NavLink to={`/repo/${repoName}/linkedin`} className={({ isActive }) => `px-3 py-1 rounded-md text-sm ${isActive ? 'bg-sky-600/20 border border-sky-600 text-sky-200' : 'bg-gray-800/30 border border-gray-700 text-gray-200'}`}>
                  Linkedin
                </NavLink>
              </nav>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </RepoContext.Provider>
  );
}
