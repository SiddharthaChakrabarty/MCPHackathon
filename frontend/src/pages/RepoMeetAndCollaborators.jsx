// FILE: src/pages/RepoMeetAndCollaborators.jsx
import React, { useEffect, useState } from "react";
import { useRepo } from "./RepoRouter";
import { useUser } from "@descope/react-sdk";

export default function RepoMeetAndCollaborators() {
  const { repoName } = useRepo();
  const { user } = useUser();

  // Meet state
  const [creating, setCreating] = useState(false);
  const [meetInfo, setMeetInfo] = useState(null);
  const [error, setError] = useState(null);

  // Collaborators state
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);

  const [creatingDoc, setCreatingDoc] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [docError, setDocError] = useState(null);


  async function createDetailedGoogleDocAndShare() {
    setCreatingDoc(true);
    setDocResult(null);
    setDocError(null);
    try {
      const res = await fetch("http://localhost:5000/api/google/create-doc-and-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user.userId, repoName }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
      }
      setDocResult(payload);
      // Open doc in new tab if created
      if (payload?.documentUrl) {
        window.open(payload.documentUrl, "_blank", "noopener");
      }
    } catch (e) {
      console.error("create doc error", e);
      setDocError(String(e));
    } finally {
      setCreatingDoc(false);
    }
  }

  // Create Meet
  async function createMeet() {
    setCreating(true);
    setError(null);
    setMeetInfo(null);
    try {
      const res = await fetch("http://localhost:5000/api/meet/create-and-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user.userId, repoName }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || payload?.message || `Server ${res.status}`);
      setMeetInfo(payload);
      if (payload.meetLink) window.open(payload.meetLink, "_blank", "noopener");
    } catch (e) {
      console.error(e);
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  // Load collaborators
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/github/repo/collaborators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId: user.userId, repoName }),
        });
        const data = await res.json();
        if (mounted) setCollaborators(data.collaborators || []);
      } catch (e) {
        console.error(e);
        if (mounted) setCollaborators([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (repoName) load();
    return () => { mounted = false; };
  }, [repoName, user.userId]);

  return (
    <div className="space-y-6">
      {/* Meet Section */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
        <h2 className="text-xl font-semibold mb-3">Create & Join Meet</h2>
        <p className="text-sm text-gray-400 mb-4">
          Invites will be sent to collaborators with known emails.
        </p>
        <div className="flex gap-3">
          <button
            onClick={createMeet}
            disabled={creating}
            className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create & Join Meet"}
          </button>
        </div>

        {meetInfo && (
          <div className="mt-4 p-3 rounded bg-gray-900/50 border border-green-700/30">
            <div className="text-sm text-emerald-200">
              Meet created — opening in a new tab.
            </div>
            <div className="text-xs text-gray-300">
              Link:{" "}
              <a
                href={meetInfo.meetLink}
                target="_blank"
                rel="noreferrer"
                className="text-sky-300 hover:underline"
              >
                {meetInfo.meetLink}
              </a>
            </div>
            <div className="mt-2 text-xs text-gray-300">
              Invited:{" "}
              {meetInfo.invited?.length
                ? meetInfo.invited.join(", ")
                : "No invite emails found."}
            </div>
          </div>
        )}

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      </div>

      {/* Collaborators Section */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
        <h2 className="text-xl font-semibold mb-4">Collaborators</h2>
        {loading ? (
          <div className="text-gray-300">Loading collaborators...</div>
        ) : collaborators.length === 0 ? (
          <div className="text-gray-400">
            No collaborators found or you do not have access.
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {collaborators.map((c) => (
              <div
                key={c.login}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-700/80 to-pink-700/80 text-white font-semibold shadow"
              >
                <img
                  src={c.avatar_url}
                  alt={c.login}
                  className="w-8 h-8 rounded-full border border-gray-700"
                />
                <a
                  href={c.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {c.login}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* GOOGLE DOCS SECTION */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50 mt-6">
        <h2 className="text-xl font-semibold mb-3">Create & Share Detailed Project Document</h2>
        <p className="text-sm text-gray-400 mb-4">
          Generate a polished, multi-section Google Doc that explains the project in depth (architecture, setup, API, roadmap, contribution notes).
          The doc will be created in your Google Drive and shared with repository collaborators (if we have their emails).
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={createDetailedGoogleDocAndShare}
            disabled={creatingDoc}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
          >
            {creatingDoc ? "Generating & sharing…" : "Create detailed Google Doc & Share"}
          </button>
        </div>

        {docResult && (
          <div className="mt-3 p-3 rounded bg-gray-900/50 border border-sky-600/30 text-sm">
            <div className="text-emerald-200 font-semibold">Document created</div>
            <div className="mt-2">URL: <a href={docResult.documentUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">{docResult.documentUrl}</a></div>
            <div className="mt-2">Shared with: {docResult.sharedWith && docResult.sharedWith.length ? docResult.sharedWith.join(", ") : "No collaborator emails found"}</div>
            <pre className="mt-2 text-xs text-gray-300 overflow-auto">{JSON.stringify(docResult.permissionResults || {}, null, 2)}</pre>
          </div>
        )}

        {docError && <div className="mt-3 text-sm text-red-400">{docError}</div>}
      </div>

    </div>
  );
}
