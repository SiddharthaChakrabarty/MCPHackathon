import React, { useEffect, useState } from "react";
import { useUser } from "@descope/react-sdk";
import { useLocation, useNavigate } from "react-router-dom";

export default function GithubDetails() {
    const { user } = useUser();
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(location.state?.analysis || null);

    useEffect(() => {
        async function fetchAnalysis() {
            setLoading(true);
            try {
                const res = await fetch("http://localhost:5000/api/github/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ loginId: user?.userId }),
                });
                const data = await res.json();
                setAnalysis(data);
            } catch (e) {
                setAnalysis(null);
            } finally {
                setLoading(false);
            }
        }
        if (!analysis && user?.userId) fetchAnalysis();
    }, [user, analysis]);

    return (
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
            <main className="relative z-10 flex items-center justify-center min-h-[80vh] px-6">
                <div className="max-w-5xl w-full bg-gradient-to-br from-white/3 to-white/6 backdrop-blur rounded-3xl p-8 border border-white/6 shadow-2xl mt-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
                    >
                        ← Back
                    </button>
                    {loading && <div className="p-8 text-white">Loading GitHub details...</div>}
                    {!loading && !analysis && <div className="p-8 text-red-400">Failed to load GitHub details.</div>}
                    {!loading && analysis && (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                <img src={analysis.profile.avatar_url} alt="avatar" className="w-12 h-12 rounded-full border border-white/20" />
                                {analysis.profile.name || analysis.profile.login}
                            </h2>
                            <div className="grid grid-cols-2 gap-4 mb-6 text-gray-200">
                                <div><b>Username:</b> {analysis.profile.login}</div>
                                <div><b>Email:</b> {analysis.profile.email}</div>
                                <div><b>Location:</b> {analysis.profile.location}</div>
                                <div><b>Company:</b> {analysis.profile.company}</div>
                                <div><b>Followers:</b> {analysis.profile.followers}</div>
                                <div><b>Following:</b> {analysis.profile.following}</div>
                                <div><b>Public Repos:</b> {analysis.profile.public_repos}</div>
                                <div><b>Joined:</b> {new Date(analysis.profile.created_at).toLocaleDateString()}</div>
                                <div className="col-span-2"><b>Bio:</b> {analysis.profile.bio}</div>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Organizations</h3>
                            <ul className="mb-6 text-gray-300">
                                {analysis.organizations.map(org => (
                                    <li key={org.id}>{org.login}</li>
                                ))}
                                {analysis.organizations.length === 0 && <li>No organizations found.</li>}
                            </ul>
                            <h3 className="text-xl font-semibold text-white mb-2">Gists</h3>
                            <ul className="mb-6 text-gray-300">
                                {analysis.gists.map(gist => (
                                    <li key={gist.id}>
                                        <a href={gist.html_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{gist.description || gist.id}</a>
                                    </li>
                                ))}
                                {analysis.gists.length === 0 && <li>No gists found.</li>}
                            </ul>
                            <h3 className="text-xl font-semibold text-white mb-2">Repositories ({analysis.repos.length})</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-xs text-gray-300">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-1 px-2">Name</th>
                                            <th className="text-left py-1 px-2">Description</th>
                                            <th className="text-left py-1 px-2">Language</th>
                                            <th className="text-left py-1 px-2">Stars</th>
                                            <th className="text-left py-1 px-2">Forks</th>
                                            <th className="text-left py-1 px-2">Topics</th>
                                            <th className="text-left py-1 px-2">License</th>
                                            <th className="text-left py-1 px-2">Contributors</th>
                                            <th className="text-left py-1 px-2">Releases</th>
                                            <th className="text-left py-1 px-2">Branches</th>
                                            <th className="text-left py-1 px-2">Tags</th>
                                            <th className="text-left py-1 px-2">Languages Breakdown</th>
                                            <th className="text-left py-1 px-2">Pull Requests</th>
                                            <th className="text-left py-1 px-2">Issues</th>
                                            <th className="text-left py-1 px-2">Private</th>
                                            <th className="text-left py-1 px-2">Created</th>
                                            <th className="text-left py-1 px-2">Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysis.repos.map((repo) => (
                                            <tr key={repo.url} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-1 px-2">
                                                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-semibold">{repo.name}</a>
                                                </td>
                                                <td className="py-1 px-2">{repo.description}</td>
                                                <td className="py-1 px-2">{repo.language}</td>
                                                <td className="py-1 px-2">{repo.stars}</td>
                                                <td className="py-1 px-2">{repo.forks}</td>
                                                <td className="py-1 px-2">{repo.topics?.join(", ")}</td>
                                                <td className="py-1 px-2">{repo.license}</td>
                                                <td className="py-1 px-2">{repo.contributors?.length}</td>
                                                <td className="py-1 px-2">{repo.releases?.length}</td>
                                                <td className="py-1 px-2">{repo.branches?.length}</td>
                                                <td className="py-1 px-2">{repo.tags?.length}</td>
                                                <td className="py-1 px-2">
                                                    {repo.languages && Object.entries(repo.languages).map(([lang, val]) => (
                                                        <span key={lang}>{lang}: {val} </span>
                                                    ))}
                                                </td>
                                                <td className="py-1 px-2">{repo.pull_requests?.length}</td>
                                                <td className="py-1 px-2">{repo.issues?.length}</td>
                                                <td className="py-1 px-2">{repo.private ? "Yes" : "No"}</td>
                                                <td className="py-1 px-2">{new Date(repo.created_at).toLocaleDateString()}</td>
                                                <td className="py-1 px-2">{new Date(repo.updated_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}