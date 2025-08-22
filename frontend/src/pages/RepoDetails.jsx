// src/pages/RepoDetails.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "@descope/react-sdk";
import { useParams, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend } from "chart.js";
import 'chartjs-adapter-date-fns';
import YouTubePanel from "../components/YoutubePanel";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend);

export default function RepoDetails() {
    const { user } = useUser();
    const { repoName } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState(null);

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
            } catch (e) {
                console.error("Failed to fetch repo details", e);
                setDetails(null);
            } finally {
                setLoading(false);
            }
        }
        if (user?.userId && repoName) fetchDetails();
    }, [user, repoName]);

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
        <div className="min-h-screen bg-black text-white relative">
            {/* Decorative circles (kept from original file) */}
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
                <div className="max-w-3xl w-full mt-16 bg-gradient-to-br from-gray-900/80 to-black/90 rounded-3xl p-8 border border-gray-800 shadow-2xl">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-8 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 transition"
                    >
                        ← Back
                    </button>

                    {loading && <div className="p-8 text-white">Loading repository details...</div>}

                    {!loading && !details && (
                        <div className="p-8 text-gray-400">Repository details unavailable.</div>
                    )}

                    {!loading && details && (
                        <>
                            <h1 className="text-3xl font-bold text-indigo-400 mb-2">
                                <a href={details.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{details.name}</a>
                            </h1>
                            <p className="text-gray-200 text-lg mb-6">{details.description}</p>

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
            </main>
        </div>
    );
}
