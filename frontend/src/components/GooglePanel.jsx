// src/components/GooglePanel.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "@descope/react-sdk";

export default function GooglePanel({ languages = [], frameworks = [], repoName = "", repoDescription = "" }) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState(null); // { queries, notes, results }
    const [saving, setSaving] = useState(false);
    const [folderUrl, setFolderUrl] = useState(null);
    const [error, setError] = useState(null);
    const [regenerating, setRegenerating] = useState(false);

    async function fetchSuggestions() {
        setLoading(true);
        setError(null);
        setSuggestions(null);
        setFolderUrl(null);
        try {
            const res = await fetch("http://localhost:5000/api/google/suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    loginId: user?.userId,
                    languages,
                    frameworks,
                    repoName,
                    description: repoDescription
                })
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Server error ${res.status} ${txt}`);
            }
            const data = await res.json();
            setSuggestions(data);
        } catch (e) {
            console.error("google suggestions error", e);
            setError(e.message || "Failed to fetch google suggestions");
            setSuggestions({ queries: [], results: [] });
        } finally {
            setLoading(false);
            setRegenerating(false);
        }
    }

    useEffect(() => {
        if (user?.userId) fetchSuggestions();
        else setSuggestions(null);
    }, [user, languages, frameworks, repoName, repoDescription]);

    async function saveToDrive() {
        if (!suggestions || !suggestions.results || suggestions.results.length === 0) {
            alert("No results to save. Try regenerating suggestions first.");
            return;
        }
        setSaving(true);
        setError(null);
        setFolderUrl(null);
        try {
            // Prepare items to send (title, link, snippet)
            const items = suggestions.results.map((r) => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet
            }));

            const payload = {
                loginId: user?.userId,
                repoName,
                folderName: `Resources - ${repoName || "repo"} - ${new Date().toISOString().slice(0, 10)}`,
                items
            };

            const res = await fetch("http://localhost:5000/api/google/create-folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || JSON.stringify(data));
                alert("Failed to save to Drive: " + (data.error || "see console"));
                return;
            }

            setFolderUrl(data.folderUrl);
            alert("Saved to Google Drive!");
        } catch (e) {
            console.error("save to drive error", e);
            setError(e.message || "Failed to save to Drive");
            alert("Failed to save to Drive: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    async function regenerate() {
        setRegenerating(true);
        setFolderUrl(null);
        await fetchSuggestions();
    }

    return (
        <div className="mt-8 bg-gray-900/60 p-6 rounded-xl border border-gray-800">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xl font-semibold mb-1">Related docs & blogs</h3>
                    <p className="text-sm text-gray-400">
                        Recent documentation, official guides and blog posts collected automatically. Save a curated folder to your Google Drive.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={regenerate}
                        disabled={loading || regenerating}
                        className="px-3 py-2 rounded bg-pink-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50"
                    >
                        {regenerating ? "Regenerating…" : "Regenerate"}
                    </button>
                </div>
            </div>

            {loading && <div className="mt-4 text-gray-300">Finding docs & blogs…</div>}

            {!loading && error && <div className="mt-4 text-sm text-red-300">Error: {error}</div>}

            {!loading && suggestions && suggestions.results && suggestions.results.length === 0 && (
                <div className="mt-4 text-gray-400">
                    No automated results found. Try clicking Regenerate or try the queries below manually.
                </div>
            )}

            {!loading && suggestions && suggestions.results && suggestions.results.length > 0 && (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                        {suggestions.results.slice(0, 12).map((r, idx) => (
                            <a key={r.link || idx} href={r.link} target="_blank" rel="noreferrer noopener" className="block p-3 rounded bg-black/10 hover:bg-black/5 transition">
                                <div className="font-medium text-sm text-white">{r.title}</div>
                                <div className="text-xs text-gray-400 mt-1 line-clamp-2">{r.snippet}</div>
                                <div className="text-xs text-sky-300 mt-2">{r.link}</div>
                            </a>
                        ))}
                    </div>

                    <div className="mt-6 flex gap-3 items-center">
                        {!folderUrl ? (
                            <button
                                onClick={saveToDrive}
                                disabled={saving}
                                className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50"
                            >
                                {saving ? "Saving…" : "Save results to my Google Drive"}
                            </button>
                        ) : (
                            <a href={folderUrl} target="_blank" rel="noreferrer noopener" className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow">
                                Open Drive folder
                            </a>
                        )}

                        <div className="text-sm text-gray-400">
                            {suggestions.notes && <div className="text-xs text-gray-300">{suggestions.notes}</div>}
                            {!suggestions.cx_present && <div className="text-xs text-yellow-300 mt-1">Search engine (CX) not configured on server; results may be limited.</div>}
                        </div>
                    </div>
                </>
            )}

            {!loading && suggestions && suggestions.queries && (
                <div className="mt-4 text-sm text-gray-400">
                    <div className="font-semibold text-gray-200 mb-2">Search queries used</div>
                    <div className="flex gap-2 flex-wrap">
                        {suggestions.queries.map((q, i) => (
                            <div key={i} className="text-xs px-2 py-1 bg-black/20 rounded">{q}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
