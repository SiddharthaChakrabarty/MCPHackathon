// src/pages/RepoDetails.jsx
import React, { useEffect, useState } from "react";
import { useUser, useSession } from "@descope/react-sdk";
import { useParams, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend } from "chart.js";
import 'chartjs-adapter-date-fns';
import YouTubePanel from "../components/YoutubePanel";
import ConnectPanel from "../components/ConnectPanel";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend);

export default function RepoDetails() {
    const { user } = useUser();
    const { repoName } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useSession();
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState(null);
    const [descSuggestion, setDescSuggestion] = useState("");
    const [descLoading, setDescLoading] = useState(false);

    useEffect(() => {
        async function fetchDetails() {
            setLoading(true);
            try {
                const res = await fetch("http://localhost:5000/api/github/repo/details", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ loginId: user?.userId, repoName }),
                });
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`Server error ${res.status}: ${txt}`);
                }
                const data = await res.json();
                setDetails(data);

                // If no description, fetch Gemini suggestion
                if (!data.description) {
                    fetchDescriptionSuggestion();
                }
            } catch (e) {
                console.error("Failed to fetch repo details", e);
                setDetails(null);
            } finally {
                setLoading(false);
            }
        }
        if (user?.userId && repoName) fetchDetails();
        // eslint-disable-next-line
    }, [user, repoName]);

    async function fetchDescriptionSuggestion() {
        setDescLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/github/description-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginId: user?.userId, repoName }),
            });
            const data = await res.json();
            setDescSuggestion(data.suggested || "");
        } catch (e) {
            setDescSuggestion("Failed to generate description.");
        } finally {
            setDescLoading(false);
        }
    }

    async function applyDescription() {
        setDescLoading(true);
        try {
            await fetch("http://localhost:5000/api/github/description-apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginId: user?.userId, repoName, description: descSuggestion }),
            });
            setDetails(d => ({ ...d, description: descSuggestion }));
            setDescSuggestion(""); // Clear suggestion after applying
        } catch (e) {
            // handle error
        } finally {
            setDescLoading(false);
        }
    }

    // Prepare commit timeline data
    const commitDates = details?.commits?.map(c => c.date).filter(Boolean) || [];
    const commitCounts = {};
    commitDates.forEach(date => {
        // expect ISO timestamp; take Y-M-D
        const day = date.slice(0, 10);
        commitCounts[day] = (commitCounts[day] || 0) + 1;
    });

    const labels = Object.keys(commitCounts).sort();
    const dataPoints = labels.map(l => commitCounts[l]);

    const timelineData = {
        labels,
        datasets: [{
            label: "Commits per day",
            data: dataPoints,
            fill: false,
            borderColor: "#6366f1",
            backgroundColor: "#6366f1",
            tension: 0.3,
        }]
    };

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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2">
                        <div className="rounded-2xl overflow-hidden border border-gray-800/60 p-8 shadow-xl relative bg-gradient-to-br from-gray-900/60 to-gray-800/60 mb-8">
                            <div className="absolute inset-0 -z-10 hero-animated-bg" aria-hidden />
                            {loading && <div className="p-8 text-white">Loading repository details...</div>}
                            {!loading && !details && (
                                <div className="p-8 text-gray-400">Repository details unavailable.</div>
                            )}
                            {!loading && details && (
                                <>
                                    <h1 className="text-3xl font-bold text-indigo-400 mb-2">
                                        <a href={details.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{details.name}</a>
                                    </h1>

                                    {/* Description Section */}
                                    <div className="mb-6">
                                        {details?.description ? (
                                            <p className="text-gray-200 text-lg mb-6">{details.description}</p>
                                        ) : descSuggestion ? (
                                            <div className="mt-3 bg-gray-800/60 p-3 rounded">
                                                <div className="text-sm text-gray-200">{descSuggestion}</div>
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        onClick={applyDescription}
                                                        disabled={descLoading}
                                                        className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold shadow"
                                                    >
                                                        Apply
                                                    </button>
                                                    <button
                                                        onClick={fetchDescriptionSuggestion}
                                                        disabled={descLoading}
                                                        className="px-3 py-1 rounded bg-pink-600 text-white font-semibold shadow"
                                                    >
                                                        Regenerate
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-3 text-gray-400">No description available.</div>
                                        )}
                                    </div>

                                    <div className="mb-10">
                                        <h2 className="text-xl font-semibold mb-4">Languages Used</h2>
                                        {details.languages?.length > 0 ? (
                                            <div className="flex flex-wrap gap-3 mb-6">
                                                {details.languages.map(lang => (
                                                    <span key={lang} className="px-4 py-2 rounded-full bg-indigo-700/80 text-white font-semibold shadow">{lang}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-gray-400">No language data available.</div>
                                        )}

                                        <h2 className="text-xl font-semibold mb-4">Frameworks Used</h2>
                                        {details.frameworks?.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {details.frameworks.map(fw => (
                                                    <span key={fw} className="px-4 py-2 rounded-full bg-pink-700/80 text-white font-semibold shadow">{fw}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-gray-400">No framework data available.</div>
                                        )}
                                    </div>

                                    {/* INSERT YouTube recommendations panel */}
                                    <YouTubePanel
                                        languages={details.languages || []}
                                        frameworks={details.frameworks || []}
                                        repoName={details.name}
                                        repoDescription={details.description}
                                    />

                                    <div className="mt-8">
                                        <h2 className="text-xl font-semibold mb-4">Commit History</h2>
                                        {labels.length > 0 ? (
                                            <div className="bg-black/50 p-4 rounded">
                                                <Line data={timelineData} options={{
                                                    scales: {
                                                        x: { title: { display: true, text: "Date" } },
                                                        y: { title: { display: true, text: "Commits" }, beginAtZero: true }
                                                    },
                                                    plugins: { legend: { display: false } }
                                                }} />
                                            </div>
                                        ) : (
                                            <div className="text-gray-400">No commit history available.</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24">
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
