// FILE: src/pages/RepoCommits.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useRepo } from "./RepoRouter";
import { useUser } from "@descope/react-sdk";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend } from "chart.js";
import 'chartjs-adapter-date-fns';
import ReactMarkdown from "react-markdown";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend);

/**
 * RepoCommits (original) now includes an inline RepoReleaseNotes component on the same page.
 * Layout: left column = commits chart, right column = release notes generator/editor.
 */

function RepoReleaseNotes({ repoName, commits }) {
  const { user } = useUser ? useUser() : { user: null }; // defensive if useUser not present
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null); // {title, release_notes}
  const [editing, setEditing] = useState(false);
  const [editedMd, setEditedMd] = useState("");
  const [creating, setCreating] = useState(false);

  // generate preview (calls backend)
  async function handleGeneratePreview() {
    if (!repoName) {
      toast.dark("No repository selected.");
      return;
    }
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const res = await fetch("https://mcp-hackathon-7buc.vercel.app/api/github/generate-release-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user?.userId, repoName }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || JSON.stringify(payload));
      setPreviewData(payload);
      setEditedMd(payload.release_notes || "");
      setEditing(true);
      toast.success("Preview generated.");
    } catch (err) {
      console.error("generate preview failed", err);
      toast.error("Failed to generate preview.");
    } finally {
      setLoadingPreview(false);
    }
  }

  // create google doc + append to README
  async function handleCreateDocAndAppend() {
    if (!editedMd?.trim()) {
      toast.dark("Nothing to publish.");
      return;
    }
    if (!user?.userId) {
      toast.dark("Please sign in to publish release notes.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("https://mcp-hackathon-7buc.vercel.app/api/github/release-notes/create-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.userId,
          repoName,
          releaseNotes: editedMd,
          shareWithCollaborators: true
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || JSON.stringify(payload));
      toast.success("Release notes published and README updated.");
      if (payload.documentUrl) {
        toast.dark(payload.documentUrl);
        // optionally open doc in new tab:
        // window.open(payload.documentUrl, "_blank");
      }
      // reset UI
      setPreviewData(null);
      setEditing(false);
      setEditedMd("");
    } catch (err) {
      console.error("create doc failed", err);
      toast.error("Failed to create doc / update README.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-800/40">
      <h2 className="text-lg font-semibold mb-3">Release Notes</h2>

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleGeneratePreview}
          disabled={loadingPreview}
          className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm shadow hover:brightness-105 disabled:opacity-50"
        >
          {loadingPreview ? "Generating..." : "Generate preview"}
        </button>

        <button
          onClick={() => {
            if (!previewData && !editedMd) {
              toast.dark("Generate a preview first.");
              return;
            }
            setEditing((s) => !s);
          }}
          className="px-3 py-2 rounded-xl bg-gray-800 text-white text-sm"
        >
          {editing ? "Hide editor" : "Edit draft"}
        </button>

        <button
          onClick={() => {
            if (!previewData && !editedMd) {
              toast.dark("Generate a preview first.");
              return;
            }
            navigator.clipboard.writeText(previewData?.release_notes || editedMd || "")
              .then(() => toast.dark("Copied draft to clipboard"))
              .catch(() => toast.error("Copy failed"));
          }}
          className="px-3 py-2 rounded-xl bg-gray-700 text-white text-sm"
        >
          Copy draft
        </button>
      </div>

      {/* Preview (read-only) */}
      {!editing && previewData && (
        <div className="bg-black/40 p-3 rounded-md border border-indigo-700/20">
          <h3 className="font-semibold text-white mb-2">{previewData.title}</h3>
          <div className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown>{previewData.release_notes}</ReactMarkdown>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setEditing(true); setEditedMd(previewData.release_notes || ""); }} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">Edit</button>
            <button onClick={handleCreateDocAndAppend} disabled={creating} className="px-3 py-1 rounded-md bg-pink-600 text-white text-sm">
              {creating ? "Publishing..." : "Create doc & append to README"}
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="bg-black/40 p-3 rounded-md border border-slate-700/20">
          <div className="mb-2 text-sm text-gray-300">Edit the Markdown below. When ready, click "Create doc & append to README".</div>
          <textarea
            value={editedMd}
            onChange={(e) => setEditedMd(e.target.value)}
            rows={12}
            className="w-full p-3 bg-transparent border border-gray-700 rounded text-sm text-gray-100 placeholder-gray-400"
            placeholder="Release notes markdown..."
          />
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreateDocAndAppend} disabled={creating} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">
              {creating ? "Publishing..." : "Create doc & append to README"}
            </button>
            <button onClick={() => { setEditing(false); toast.dark("Draft closed."); }} className="px-4 py-2 rounded-xl bg-gray-800 text-white">Cancel</button>
          </div>
        </div>
      )}

      {!previewData && !editing && (
        <div className="text-sm text-gray-400 mt-2">No generated release notes yet. Click "Generate preview" to create one from commits.</div>
      )}
    </div>
  );
}

export default function RepoCommits() {
  const { details } = useRepo();
  const commitDates = details?.commits?.map(c => c.date).filter(Boolean) || [];

  // build per-day counts
  const commitCounts = useMemo(() => {
    const map = {};
    commitDates.forEach(date => {
      // date may be ISO string; slice to YYYY-MM-DD
      const day = date.slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  }, [commitDates]);

  const labels = Object.keys(commitCounts).sort();
  const dataPoints = labels.map(l => commitCounts[l]);
  const timelineData = {
    labels,
    datasets: [{ label: 'Commits per day', data: dataPoints, fill: false, borderColor: '#6366f1', backgroundColor: '#6366f1', tension: 0.3 }]
  };

  if (!details) return <div className="p-6 text-gray-400">No commit data available.</div>;

  return (
    <>
      {/* ToastContainer separated from layout so it doesn't shift content */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 9999 }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: commits chart (span 2 on lg) */}
        <div className="lg:col-span-2 rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
          <h2 className="text-xl font-semibold mb-4">Commit History</h2>
          {labels.length > 0 ? (
            <div className="bg-black/50 p-4 rounded-xl border border-indigo-700/30">
              <Line
                data={timelineData}
                options={{
                  scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Commits' }, beginAtZero: true, ticks: { precision: 0 } }
                  },
                  plugins: { legend: { display: false } },

                }}

              />
              {/* Simple commit list preview */}

            </div>
          ) : (
            <div className="text-gray-400">No commits found.</div>
          )}
        </div>

        {/* Right: Release notes UI */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24">
            <RepoReleaseNotes repoName={details?.name || details?.url?.split("/").slice(-2).join("/")} commits={details?.commits || []} />
          </div>
        </aside>
      </div>
    </>
  );
}
