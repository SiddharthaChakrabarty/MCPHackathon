// src/pages/AiAnalysisView.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function RepoCard({ repo }) {
    return (
        <div className="p-4 bg-white/5 rounded border border-white/6 mb-3">
            <h4 className="font-semibold">{repo.name}</h4>
            <p>{repo.short_summary}</p>
            <div className="text-sm text-gray-300 mt-2">
                <b>Priority:</b> {repo.priority_score} &nbsp;
                <b>Effort:</b> {repo.estimated_effort}
            </div>
        </div>
    );
}

export default function AiAnalysisView() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const data = state?.analysis;

    if (!data) {
        return (
            <div className="p-8 text-white">
                No analysis present. Go back and run "Analyze with Gemini AI".
                <button onClick={() => navigate(-1)} className="ml-4 underline">Back</button>
            </div>
        );
    }

    const analysis = data.analysis || {};
    const profile = data.profile || {};

    return (
        <div className="min-h-screen p-8 bg-black text-white">
            <button onClick={() => navigate(-1)} className="mb-4 px-3 py-2 rounded bg-gray-800">← Back</button>

            <div className="max-w-5xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">{profile.name || profile.login} — AI Analysis</h1>
                    <p className="text-gray-300 mt-2">{analysis.account_summary}</p>
                </header>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold">Top languages</h2>
                    <pre className="bg-white/5 p-3 rounded mt-2 text-xs">{JSON.stringify(analysis.top_languages, null, 2)}</pre>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold">Repo analyses</h2>
                    {Array.isArray(analysis.repo_analyses) && analysis.repo_analyses.length > 0 ? (
                        analysis.repo_analyses.map((repo) => <RepoCard key={repo.name} repo={repo} />)
                    ) : (
                        <div className="text-gray-400">No repo-level analyses were returned. See raw output below.</div>
                    )}
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold">Global recommendations</h2>
                    <ul className="list-disc pl-5 text-gray-300">
                        {(analysis.global_recommendations || []).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold">Roadmap</h2>
                    <ol className="list-decimal pl-5 text-gray-300">
                        {(analysis.roadmap || []).map((r, i) => <li key={i}>{r}</li>)}
                    </ol>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold">Raw LLM output</h2>
                    <pre className="bg-white/5 p-3 rounded mt-2 text-xs whitespace-pre-wrap">{analysis.raw || JSON.stringify(analysis, null, 2)}</pre>
                </section>
            </div>
        </div>
    );
}
