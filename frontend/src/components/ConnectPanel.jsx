// src/components/ConnectPanel.jsx
import React, { useState } from "react";
import { useDescope, useUser } from "@descope/react-sdk";
import { useNavigate } from "react-router-dom";

export default function ConnectPanel() {
    const sdk = useDescope();
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function connectGithub() {
        try {
            const result = await sdk.outbound.connect("github", { redirectURL: window.location.href });
            if (result && result.data && result.data.url) {
                window.location.href = result.data.url;
            } else {
                console.error("No URL returned from outbound.connect");
            }
        } catch (e) {
            console.error("connect error:", e);
            alert("Connect failed: " + e.message);
        }
    }

    async function runGithubAnalysis() {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/github/minimal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ loginId: user?.userId }),
            });
            const data = await res.json();
            navigate("/github-details", { state: { analysis: data } });
        } catch (e) {
            console.error(e);
            alert("Analysis failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
            <h4 className="font-semibold text-white mb-4 text-xl flex items-center gap-2">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path fill="#fff" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.1-1.48-1.1-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.04a9.38 9.38 0 0 1 2.5-.34c.85.01 1.71.12 2.5.34 1.91-1.32 2.75-1.04 2.75-1.04.55 1.41.2 2.45.1 2.71.64.71 1.03 1.62 1.03 2.74 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.89 0 1.36-.01 2.46-.01 2.8 0 .26.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
                </svg>
                Connect to GitHub
            </h4>
            <p className="text-gray-300 mb-6">
                Connect your GitHub account to analyze your repositories and get personalized recommendations.
            </p>
            <div className="flex flex-col gap-3">
                <button
                    onClick={connectGithub}
                    className="px-5 py-2 rounded bg-gradient-to-r from-gray-900 to-gray-700 text-white font-semibold shadow hover:scale-[1.01] transition"
                >
                    {user?.userId ? "Reconnect GitHub" : "Connect GitHub"}
                </button>
                <button
                    disabled={loading}
                    onClick={runGithubAnalysis}
                    className="px-5 py-2 rounded bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow hover:scale-[1.01] transition"
                >
                    {loading ? "Analyzing…" : "Analyze my GitHub repositories"}
                </button>
            </div>

        </div>
    );
}