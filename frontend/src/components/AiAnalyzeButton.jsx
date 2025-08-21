// src/components/AiAnalyzeButton.jsx
import React, { useState } from "react";
import { useUser } from "@descope/react-sdk";
import { useNavigate } from "react-router-dom";

export default function AiAnalyzeButton() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    async function runAiAnalysis() {
        if (!user?.userId) {
            alert("You need to be logged in.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/github/analyze/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginId: user.userId }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.detail || "Analysis failed");
            }
            // navigate to a viewer page that renders analysis
            navigate("/ai-analysis", { state: { analysis: data } });
        } catch (e) {
            console.error(e);
            alert("AI analysis failed: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={runAiAnalysis}
            disabled={loading}
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:opacity-95"
        >
            {loading ? "Analyzing…" : "Analyze with Gemini AI"}
        </button>
    );
}
