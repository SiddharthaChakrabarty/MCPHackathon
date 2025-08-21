import React, { useEffect, useState } from "react";
import { useUser } from "@descope/react-sdk";
import { useParams, useNavigate } from "react-router-dom";
import { Pie, Line } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, TimeScale } from "chart.js";
import 'chartjs-adapter-date-fns';

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, TimeScale);

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
                const data = await res.json();
                setDetails(data);
            } catch (e) {
                setDetails(null);
            } finally {
                setLoading(false);
            }
        }
        if (user?.userId && repoName) fetchDetails();
    }, [user, repoName]);

    // Prepare language pie chart data
    const langData = details?.languages?.length
        ? {
            labels: details.languages,
            datasets: [{
                data: details.languages.map(() => 1), // Equal weight for display
                backgroundColor: [
                    "#6366f1", "#ec4899", "#06b6d4", "#f59e42", "#10b981", "#f43f5e", "#a3e635", "#fbbf24"
                ],
            }]
        }
        : null;

    // Prepare commit timeline data
    const commitDates = details?.commits?.map(c => c.date).filter(Boolean) || [];
    const commitCounts = {};
    commitDates.forEach(date => {
        const day = date.slice(0, 10);
        commitCounts[day] = (commitCounts[day] || 0) + 1;
    });
    const timelineData = {
        labels: Object.keys(commitCounts),
        datasets: [{
            label: "Commits per day",
            data: Object.values(commitCounts),
            fill: false,
            borderColor: "#6366f1",
            backgroundColor: "#6366f1",
            tension: 0.3,
        }]
    };

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
                <div className="max-w-3xl w-full mt-16 bg-gradient-to-br from-gray-900/80 to-black/90 rounded-3xl p-8 border border-gray-800 shadow-2xl">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-8 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 transition"
                    >
                        ← Back
                    </button>
                    {loading && <div className="p-8 text-white">Loading repository details...</div>}
                    {!loading && details && (
                        <>
                            <h1 className="text-3xl font-bold text-indigo-400 mb-2">
                                <a href={details.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{details.name}</a>
                            </h1>
                            <p className="text-gray-200 text-lg mb-6">{details.description}</p>
                            <div className="mb-10">
                                <h2 className="text-xl font-semibold mb-4">Language Analysis</h2>
                                {langData ? (
                                    <div className="flex flex-col items-center">
                                        <div style={{ width: 340, height: 340 }}>
                                            <Pie data={langData} />
                                        </div>
                                        {details.frameworks?.length > 0 && (
                                            <div className="mt-6">
                                                <h3 className="text-lg font-semibold mb-2">Frameworks Detected</h3>
                                                <ul className="list-disc list-inside text-gray-200">
                                                    {details.frameworks.map(fw => (
                                                        <li key={fw}>{fw}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-gray-400">No language data available.</div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Commit History</h2>
                                {commitDates.length > 0 ? (
                                    <Line data={timelineData} options={{
                                        scales: {
                                            x: { title: { display: true, text: "Date" } },
                                            y: { title: { display: true, text: "Commits" }, beginAtZero: true }
                                        }
                                    }} />
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