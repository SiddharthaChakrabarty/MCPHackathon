// FILE: src/pages/RepoMeetAndCollaborators.jsx
import React, { useEffect, useState } from "react";
import { useRepo } from "./RepoRouter";
import { useUser } from "@descope/react-sdk";

/**
 * RepoMeetAndCollaborators
 * - create Meet
 * - list collaborators
 * - create Google Doc (existing)
 * - create Slack channel & invite collaborators (existing)
 * - NEW: create Google Doc and automatically post the doc link to a Slack channel:
 *   * If a slackChannelId already exists in slackResult it will be used.
 *   * If a channel name is filled but not created, we create the channel first (calls /api/slack/create-channel),
 *     then create the Google Doc and pass the channelId to /api/google/create-doc-and-share so the backend posts it.
 */

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

  // Google doc state
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [docError, setDocError] = useState(null);

  // Slack state
  const [slackChannelName, setSlackChannelName] = useState("");
  const [creatingSlack, setCreatingSlack] = useState(false);
  const [creatingSlackChannel, setCreatingSlackChannel] = useState(false);
  const [slackResult, setSlackResult] = useState(null);
  const [slackError, setSlackError] = useState(null);
  const [slackPrivate, setSlackPrivate] = useState(false);

  // helper: create slack channel (existing behavior)
  async function createSlackChannelAndInvite() {
    setCreatingSlackChannel(true);
    setSlackResult(null);
    setSlackError(null);

    if (!slackChannelName || !repoName) {
      setSlackError("Provide a channel name and ensure a repository is selected.");
      setCreatingSlackChannel(false);
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/slack/create-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.userId,
          repoName,
          channelName: slackChannelName,
          isPrivate: !!slackPrivate
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
      }
      setSlackResult(payload);
      setSlackError(null);
      // open the slack channel redirect (this will redirect to the right workspace)
      if (payload && payload.channelId) {
        const redirectUrl = `https://slack.com/app_redirect?channel=${payload.channelId}`;
        window.open(redirectUrl, "_blank", "noopener");
      }
    } catch (e) {
      console.error("create slack channel error", e);
      setSlackError(String(e));
      setSlackResult(null);
    } finally {
      setCreatingSlackChannel(false);
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

  // Create Google Doc & share (optionally post to Slack)
  // If slackChannelName is provided and not yet created, this function will create it first.
  async function createDetailedGoogleDocAndShare({ postToSlack = false } = {}) {
    setCreatingDoc(true);
    setDocResult(null);
    setDocError(null);

    // Determine slackChannelId to pass to create-doc endpoint (if user wants posting)
    let channelIdToUse = slackResult?.channelId || null;

    // If user asked to post to Slack, and we don't have a channelId but slackChannelName is filled,
    // create the channel first (same as the createSlackChannelAndInvite flow)
    if (postToSlack && !channelIdToUse && slackChannelName) {
      setCreatingSlack(true);
      setSlackError(null);
      try {
        const sres = await fetch("http://localhost:5000/api/slack/create-channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loginId: user.userId,
            repoName,
            channelName: slackChannelName,
            isPrivate: !!slackPrivate
          })
        });
        const spayload = await sres.json().catch(() => ({}));
        if (!sres.ok) {
          throw new Error(spayload?.error || spayload?.message || `HTTP ${sres.status}`);
        }
        setSlackResult(spayload);
        channelIdToUse = spayload.channelId || null;
      } catch (e) {
        console.error("create slack channel (pre-doc) error", e);
        setSlackError(String(e));
        setCreatingSlack(false);
        setCreatingDoc(false);
        return;
      } finally {
        setCreatingSlack(false);
      }
    }

    // Now create the Google Doc and provide slackChannelId if available
    try {
      const body = {
        loginId: user.userId,
        repoName,
        // If a channel id is available and the user requested posting, include it:
        ...(postToSlack && channelIdToUse ? { slackChannelId: channelIdToUse } : {})
      };

      const res = await fetch("http://localhost:5000/api/google/create-doc-and-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
      }
      setDocResult(payload);
      setDocError(null);

      // if doc created, open it
      if (payload.documentUrl) {
        window.open(payload.documentUrl, "_blank", "noopener");
      }

      // if slack post result present, show/update slackResult
      if (payload.slackPost) {
        setSlackResult(prev => ({ ...(prev || {}), postResult: payload.slackPost }));
      }
    } catch (e) {
      console.error("create doc error", e);
      setDocError(String(e));
    } finally {
      setCreatingDoc(false);
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


      {/* SLACK SECTION */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50 mt-6">
        <h2 className="text-xl font-semibold mb-3">Create Slack Channel & Invite Collaborators</h2>
        <p className="text-sm text-gray-400 mb-4">
          Create a dedicated Slack channel for this repo and invite mapped collaborators (we match by email). Only existing Slack users will be invited.
          To auto-post the generated Google Doc into Slack, either create the channel now or fill the channel name and use "Create doc & Post to Slack".
        </p>

        <div className="flex gap-2 mb-4">
          <input
            value={slackChannelName}
            onChange={(e) => setSlackChannelName(e.target.value)}
            placeholder="channel-name (lowercase, no spaces)"
            className="px-3 py-2 bg-transparent border rounded w-full text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={slackPrivate} onChange={(e) => setSlackPrivate(e.target.checked)} />
            Private
          </label>
        </div>



        <div className="flex gap-3">
          <button
            onClick={createSlackChannelAndInvite}
            disabled={creatingSlackChannel}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50"
          >
            {creatingSlack ? "Creating channel..." : "Create Slack channel & invite"}
          </button>
        </div>

        {slackResult && (
          <div className="mt-3 p-3 rounded bg-gray-900/50 border border-purple-600/30 text-sm">
            <div className="text-emerald-200 font-semibold">Slack channel created</div>
            <div className="mt-2">Channel ID: <span className="font-mono">{slackResult.channelId}</span></div>
            <div className="mt-2">Invited: {slackResult.invited?.length ? slackResult.invited.join(", ") : "None"}</div>
            <div className="mt-2">Missing emails (not found in Slack): {slackResult.missingEmails?.length ? slackResult.missingEmails.join(", ") : "None"}</div>
            {slackResult.channelId && (
              <div className="mt-2">
                Open channel: <a className="text-sky-300 hover:underline" href={`https://slack.com/app_redirect?channel=${slackResult.channelId}`} target="_blank" rel="noreferrer">Open in Slack</a>
              </div>
            )}

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
            onClick={() => createDetailedGoogleDocAndShare({ postToSlack: true })}
            disabled={creatingDoc || creatingSlack}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold disabled:opacity-50"
          >
            {creatingDoc || creatingSlack ? "Creating & posting to Slack…" : "Create doc & Post to Slack"}
          </button>
        </div>

        {docResult && (
          <div className="mt-3 p-3 rounded bg-gray-900/50 border border-sky-600/30 text-sm">
            <div className="text-emerald-200 font-semibold">Document created</div>
            <div className="mt-2">URL: <a href={docResult.documentUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">{docResult.documentUrl}</a></div>
            <div className="mt-2">Shared with: {docResult.sharedWith && docResult.sharedWith.length ? docResult.sharedWith.join(", ") : "No collaborator emails found"}</div>

          </div>
        )}

        {docError && <div className="mt-3 text-sm text-red-400">{docError}</div>}
      </div>


      {slackError && <div className="mt-3 text-sm text-red-400">{slackError}</div>}
    </div>
  );
}
