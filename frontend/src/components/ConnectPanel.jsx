// src/components/ConnectPanel.jsx
import React, { useState } from "react";
import { useDescope, useUser } from "@descope/react-sdk";

export default function ConnectPanel() {
    const sdk = useDescope();
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);

    async function connectProvider(providerId) {
        try {
            // This will redirect the user to the provider consent screen and
            // Descope will manage the redirect back automatically.
            await sdk.outbound.connect(providerId, {
                redirectURL: window.location.href // Ensure redirect back to current page after consent
            });
        } catch (e) {
            console.error("connect error:", e);
            alert("Connect failed: " + e.message);
        }
    }

    async function runGithubAnalysis() {
        setLoading(true);
        try {
            // send the user's loginId to the backend (for demo we pass email)
            const res = await fetch("http://localhost:5000/api/github/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ loginId: user?.email }),
            });
            const data = await res.json();
            setAnalysis(data);
        } catch (e) {
            console.error(e);
            alert("Analysis failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 bg-white/5 rounded-xl border border-white/6">
            <h4 className="font-semibold text-white mb-3">Connect external tools</h4>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => connectProvider("github")}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                    Connect GitHub
                </button>
                <button
                    onClick={() => connectProvider("google")}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                    Connect Google (Calendar / YouTube)
                </button>
                <button
                    onClick={() => connectProvider("linkedin")}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                    Connect LinkedIn
                </button>
                <button
                    onClick={() => connectProvider("spotify")}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                    Connect Spotify
                </button>
                <button
                    onClick={() => connectProvider("notion")}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                    Connect Notion
                </button>
                <button
                    onClick={() => connectProvider("slack")}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                    Connect Slack
                </button>
                <button
                    onClick={() => connectProvider("discord")}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                    Connect Discord
                </button>
            </div>

            <div className="mt-4">
                <button
                    disabled={loading}
                    onClick={runGithubAnalysis}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow"
                >
                    {loading ? "Analyzing…" : "Analyze my GitHub and plan"}
                </button>
            </div>

            {analysis && (
                <div className="mt-4 p-3 bg-black/40 rounded">
                    <h5 className="font-semibold">Analysis summary</h5>
                    <pre className="text-xs text-gray-300">{JSON.stringify(analysis, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}