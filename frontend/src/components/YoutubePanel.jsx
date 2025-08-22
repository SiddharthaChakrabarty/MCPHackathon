// src/components/YouTubePanel.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "@descope/react-sdk";

export default function YouTubePanel({ languages = [], frameworks = [], repoName = "", repoDescription = "" }) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [creating, setCreating] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState(null);
    const [error, setError] = useState(null);
    const [regenerating, setRegenerating] = useState(false);

    // Fetch suggestions
    async function fetchSuggestions() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:5000/api/youtube/suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    loginId: user?.userId,
                    languages,
                    frameworks,
                    repoName,
                    description: repoDescription,
                }),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Server error: ${res.status} ${text}`);
            }
            const data = await res.json();
            setSuggestions(data);
        } catch (e) {
            setError(e.message || "Failed to fetch suggestions");
            setSuggestions({ videos: [], queries: [] });
        } finally {
            setLoading(false);
            setRegenerating(false);
        }
    }

    useEffect(() => {
        if (user?.userId) {
            fetchSuggestions();
        } else {
            setSuggestions(null);
        }
    }, [user, languages, frameworks, repoName, repoDescription]);

    async function createPlaylist() {
        if (!suggestions || !suggestions.videos || suggestions.videos.length === 0) {
            alert("No videos to create a playlist with.");
            return;
        }
        setCreating(true);
        setError(null);

        try {
            const videoIds = suggestions.videos.map((v) => v.videoId).filter(Boolean);
            const payload = {
                loginId: user?.userId,
                videoIds,
                title: suggestions.playlist_plan?.title || `Learning playlist for ${repoName || "repo"}`,
                description: suggestions.playlist_plan?.description || `Videos curated for ${repoName || "your repository"}`,
            };

            const res = await fetch("http://localhost:5000/api/youtube/create-playlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || JSON.stringify(data));
                alert("Playlist creation failed: " + (data.error || "see console"));
            } else {
                setPlaylistUrl(data.playlistUrl);
                alert("Playlist created successfully!");
            }
        } catch (e) {
            setError(e.message || "Playlist creation failed");
            alert("Playlist creation failed: " + e.message);
        } finally {
            setCreating(false);
        }
    }

    // Regenerate suggestions and playlist
    async function regenerateSuggestionsAndPlaylist() {
        setRegenerating(true);
        setPlaylistUrl(null); // Remove old playlist
        await fetchSuggestions();
    }

    return (
        <div className="mt-8 bg-gray-900/60 p-6 rounded-xl border border-gray-800">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xl font-semibold mb-1">Learning recommendations</h3>
                    <p className="text-sm text-gray-400">
                        Video tutorials and playlists suggested based on the languages & frameworks detected in this repository.
                    </p>
                </div>
                <button
                    onClick={regenerateSuggestionsAndPlaylist}
                    disabled={loading || regenerating}
                    className="px-3 py-2 rounded bg-pink-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50"
                >
                    {regenerating ? "Regenerating…" : "Regenerate suggestions"}
                </button>
            </div>

            {loading && <div className="mt-6 text-gray-300">Loading suggestions…</div>}

            {!loading && error && (
                <div className="mt-4 text-sm text-red-300">Error: {error}</div>
            )}

            {!loading && suggestions && suggestions.videos && suggestions.videos.length === 0 && (
                <div className="mt-6 text-gray-400">No video suggestions found.</div>
            )}

            {!loading && suggestions && suggestions.videos && suggestions.videos.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {suggestions.videos.map((v) => (
                            <a
                                key={v.videoId}
                                href={v.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="flex gap-3 items-start p-3 rounded bg-black/20 hover:bg-black/10 transition"
                            >
                                <img src={v.thumbnail} alt={v.title} className="w-28 h-16 object-cover rounded" />
                                <div className="flex-1">
                                    <div className="font-semibold text-sm text-white leading-tight">{v.title}</div>
                                    <div className="text-xs text-gray-400 mt-1">{v.channelTitle}</div>
                                    <div className="text-xs text-gray-400 line-clamp-2 mt-1">{v.description?.slice(0, 120)}</div>
                                </div>
                            </a>
                        ))}
                    </div>

                    <div className="mt-6 flex gap-3 items-center">
                        {!playlistUrl ? (
                            <button
                                onClick={createPlaylist}
                                disabled={creating}
                                className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50"
                            >
                                {creating ? "Creating…" : "Create private playlist on my YouTube"}
                            </button>
                        ) : (
                            <a
                                href={playlistUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow"
                            >
                                Open playlist
                            </a>
                        )}
                        <div className="text-sm text-gray-400">
                            {suggestions.playlist_plan?.title && <div className="font-medium text-white">{suggestions.playlist_plan.title}</div>}
                            {suggestions.playlist_plan?.description && <div className="text-xs">{suggestions.playlist_plan.description}</div>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
