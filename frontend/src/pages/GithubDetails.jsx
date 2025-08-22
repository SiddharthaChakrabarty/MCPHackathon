/* ----------------------------- src/pages/GithubDetails.jsx ----------------------------- */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUser, useSession } from "@descope/react-sdk";
import { useNavigate } from "react-router-dom";
import ConnectPanel from "../components/ConnectPanel";
import AuthModal from "../components/AuthModal"; // import modal

function formatDate(dateStr) {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GithubDetails() {
    const { user } = useUser();
    const { isAuthenticated } = useSession();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [repos, setRepos] = useState(null); // null means "not loaded yet"
    const [showFlow, setShowFlow] = useState(null);

    useEffect(() => {
        if (isAuthenticated && !repos && user?.userId) {
            setLoading(true);
            fetch("http://localhost:5000/api/github/minimal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginId: user.userId }),
            })
                .then(res => res.json())
                .then(data => setRepos(data.repos || []))
                .catch(() => setRepos([]))
                .finally(() => setLoading(false));
        }
    }, [isAuthenticated, user, repos]);

    // Only show modal if NOT authenticated
    useEffect(() => {
        if (!isAuthenticated) setShowFlow("sign-up-or-in");
        else setShowFlow(null);
    }, [isAuthenticated]);

    // If not authenticated, show modal and block page
    if (!isAuthenticated) {
        return (
            <>
                <AuthModal showFlow={showFlow} setShowFlow={setShowFlow} setAuthChanged={() => window.location.reload()} />
                <div className="min-h-screen flex items-center justify-center bg-black text-white">
                    <div className="text-lg">Please sign in to view your GitHub repositories.</div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
            {/* top header */}
            <header className="w-full border-b border-gray-800/60 bg-gradient-to-b from-transparent to-black/40 backdrop-blur sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-700 to-pink-600 text-white font-bold">FC</div>
                        <div>
                            <div className="text-sm font-semibold">FutureCommit</div>
                            <div className="text-xs text-gray-400">Commit to your growth, not just your code.</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-md bg-gray-800/50 border border-gray-700 text-sm">← Back</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="rounded-2xl overflow-hidden border border-gray-800/60 p-6 shadow-xl relative bg-gradient-to-br from-gray-900/60 to-gray-800/60 mb-8">
                    <div className="absolute inset-0 -z-10 hero-animated-bg" aria-hidden />
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <motion.h1 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-indigo-400 to-cyan-300">Your GitHub Repositories</motion.h1>
                            <motion.p initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08, duration: 0.5 }} className="mt-3 text-sm text-gray-300 max-w-2xl">We pulled repositories linked to your account. Click a repo to inspect details, watch curated learning videos, or create project updates.</motion.p>
                        </div>

                        <div className="hidden md:block w-64">
                            <motion.div initial={{ rotateY: 12, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="p-3 rounded-lg bg-gray-900/30 border border-gray-800/50">
                                <div className="text-xs text-gray-400">Quick tips</div>
                                <ul className="mt-3 text-xs text-gray-300 space-y-2">
                                    <li>• Click a repo to open its details page.</li>
                                    <li>• Use the Connect panel below to link services (YouTube, Google Calendar, Notion, Spotify).</li>
                                    <li>• Refresh connections if something looks out of date.</li>
                                </ul>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2">
                        <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
                            {loading || repos === null ? (
                                <div className="p-8 text-gray-300">Loading repositories...</div>
                            ) : repos.length === 0 ? (
                                <div className="p-8 text-gray-400 text-center">
                                    No repositories found.<br />
                                    <span className="text-xs text-red-400">{repos.error || ""}</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {repos.map((repo, idx) => (
                                        <motion.div
                                            key={repo.name}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.04 * idx, duration: 0.45 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => navigate(`/repo/${repo.name}`)}
                                            className="relative group bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-xl shadow-xl p-6 border border-gray-800 overflow-hidden cursor-pointer"
                                        >
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-10 group-hover:opacity-20 transition pointer-events-none" />
                                            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-500 rounded-full opacity-6 group-hover:opacity-18 transition pointer-events-none" />

                                            <div className="flex items-start justify-between gap-4">
                                                <a href={repo.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-lg font-bold text-indigo-400 hover:underline">{repo.name}</a>

                                                <div className="ml-2 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${repo.private ? "bg-red-700 text-white" : "bg-green-700 text-white"}`}>
                                                        {repo.private ? "Private" : "Public"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                                                <div className="text-xs text-gray-400 whitespace-nowrap">Last commit: {formatDate(repo.last_commit)}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="lg:col-span-1">
                        <div className="sticky top-24">
                            {/* Pass vertical layout to ensure stacked connectors in sidebar */}
                            <ConnectPanel layout="vertical" />
                        </div>
                    </aside>
                </div>
            </main>

            <style jsx>{`
                .hero-animated-bg {
                    background: linear-gradient(120deg, rgba(99,102,241,0.04), rgba(236,72,153,0.03), rgba(6,182,212,0.03));
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
