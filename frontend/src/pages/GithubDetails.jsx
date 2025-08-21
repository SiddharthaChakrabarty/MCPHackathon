import React, { useEffect, useState } from "react";
import { useUser } from "@descope/react-sdk";
import { useNavigate } from "react-router-dom";

function formatDate(dateStr) {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GithubDetails() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [repos, setRepos] = useState([]);

    useEffect(() => {
        async function fetchRepos() {
            setLoading(true);
            try {
                const res = await fetch("http://localhost:5000/api/github/minimal", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ loginId: user?.userId }),
                });
                const data = await res.json();
                setRepos(data.repos || []);
            } catch (e) {
                setRepos([]);
            } finally {
                setLoading(false);
            }
        }
        if (user?.userId) fetchRepos();
    }, [user]);

    return (
        <div className="min-h-screen bg-black text-white relative">
            {/* Decorative circles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <svg className="absolute -right-40 -top-28 opacity-20" width="600" height="600" viewBox="0 0 600 600" fill="none">
                    <defs>
                        <linearGradient id="g1" x1="0" x2="1">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                    </defs>
                    <circle cx="300" cy="300" r="200" fill="url(#g1)" />
                </svg>
                <svg className="absolute -left-40 bottom-0 opacity-10" width="500" height="500" viewBox="0 0 500 500" fill="none">
                    <circle cx="250" cy="250" r="200" fill="#06b6d4" />
                </svg>
            </div>
            <main className="relative z-10 flex flex-col items-center min-h-[80vh] px-6">
                <div className="max-w-3xl w-full mt-16">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-8 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 transition"
                    >
                        ← Back
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-8 text-center">Your GitHub Repositories</h1>
                    {loading && <div className="p-8 text-white">Loading repositories...</div>}
                    {!loading && repos.length === 0 && (
                        <div className="p-8 text-gray-400 text-center">No repositories found.</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {repos.map((repo) => (
                            <div
                                key={repo.name}
                                className="relative group bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-xl shadow-xl p-6 mb-8 border border-gray-800 overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                                onClick={() => navigate(`/repo/${repo.name}`)}
                            >
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-20 group-hover:opacity-30 transition"></div>
                                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-500 rounded-full opacity-10 group-hover:opacity-20 transition"></div>
                                <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-indigo-400 mb-2 hover:underline">{repo.name}</a>
                                <div className="flex items-center justify-between mt-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${repo.private ? "bg-red-700 text-white" : "bg-green-700 text-white"}`}>
                                        {repo.private ? "Private" : "Public"}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        Last commit: {formatDate(repo.last_commit)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}