// FILE: src/pages/RepoOverview.jsx
import React from "react";
import { useRepo } from "./RepoRouter";
import YouTubePanel from "../components/YoutubePanel";
import GooglePanel from "../components/GooglePanel";

export default function RepoRecommendations() {
  const { details, loading, error } = useRepo(); // or your repo context/hook

  if (loading) return <div className="p-6 text-gray-300">Loading recommendations...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!details) return <div className="p-6 text-gray-400">Repository details unavailable.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
        <h2 className="text-2xl font-bold mb-6">Recommended Learning Videos</h2>
        <YouTubePanel
          languages={details.languages || []}
          frameworks={details.frameworks || []}
          repoName={details.name}
          repoDescription={details.description}
        />

        <GooglePanel
          languages={details.languages || []}
          frameworks={details.frameworks || []}
          repoName={details.name}
          repoDescription={details.description}
        />
      </div>
    </div>
  );
}
