import React, { useState } from "react";
import { Descope } from "@descope/react-sdk";

// FirstPage (single-file) — a starter landing/dashboard that:
// - uses Descope for sign-up / sign-in
// - shows integration tiles (GitHub, Notion, LinkedIn, YouTube, Google Calendar, Gmail, Slack, Discord, Google Meet, Spotify)
// - shows simple connect button per integration (these call your backend endpoints)
// - is Tailwind-ready (uses utility classes)

// USAGE
// 1) Put this file in your React project (e.g. src/FirstPage.jsx).
// 2) Ensure Tailwind is configured (the classes below assume Tailwind).
// 3) Provide the following env vars or edit the defaults below:
//    - REACT_APP_DESCOPE_PROJECT_ID (defaults to the project id you shared)
//    - REACT_APP_API_BASE (your backend URL that handles outbound OAuth)
// 4) Implement backend endpoints listed in connectIntegration() comments to actually perform OAuth and token handling.

const PROJECT_ID = "P31EeCcDPtwQGyi9wbZk4ZLKKE5a";
const API_BASE = "http://localhost:4000"; // your backend

const INTEGRATIONS = [
  { id: "github", label: "GitHub" },
  { id: "notion", label: "Notion" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "gcalendar", label: "Google Calendar" },
  { id: "gmail", label: "Gmail" },
  { id: "slack", label: "Slack" },
  { id: "discord", label: "Discord" },
  { id: "gmeet", label: "Google Meet" },
  { id: "spotify", label: "Spotify" },
];

export default function FirstPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [statuses, setStatuses] = useState(() =>
    // demo starting state — in a real app fetch connection status from your backend
    INTEGRATIONS.reduce((acc, it) => {
      acc[it.id] = { connected: false };
      return acc;
    }, {})
  );

  // This function is triggered when a user clicks "Connect" on an integration tile.
  // The recommended pattern:
  // 1) Frontend calls your backend: GET /api/oauth/{provider}/start (or POST)
  // 2) Backend builds the provider auth URL (including client_id, redirect_uri, state) and returns it OR returns a 302 redirect
  // 3) Frontend navigates the browser to that URL OR backend redirects. After the provider completes, it calls your backend callback
  // 4) Backend exchanges code for tokens, stores tokens against the user, and associates integration with that user (DB/Descope user metadata)
  // 5) Backend optionally redirects frontend back to your SPA (e.g. /integrations?connected=github)
  // The code below assumes you have an endpoint that returns a URL to redirect the user to.
  async function connectIntegration(id) {
    try {
      setConnecting(id);
      // Example: ask your backend for the OAuth URL for the chosen provider
      const res = await fetch(`${API_BASE}/api/oauth/${id}/start`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ /* optional: userId, callbackContext */ }),
      });

      if (!res.ok) throw new Error("Failed to get redirect URL from backend");
      const json = await res.json();

      if (json && json.url) {
        // navigate to provider's auth page
        window.location.href = json.url;
      } else {
        throw new Error("Invalid response from backend");
      }
    } catch (err) {
      console.error("connectIntegration error", err);
      alert(`Unable to start connection for ${id}: ${err.message}`);
      setConnecting(null);
    }
  }

  // onSuccess from Descope's embedded flow — set user and close modal
  function handleAuthSuccess(e) {
    // e.detail will contain user fields depending on your Descope flow
    setUser(e.detail.user || { name: "Unknown", email: "unknown@" });
    setShowAuth(false);
    // usually you'd also inform your backend to create a session
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-slate-100">
      {/* Header */}
      <header className="max-w-6xl mx-auto p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center font-bold">AI</div>
          <div>
            <h1 className="text-xl font-semibold">CreatorHub</h1>
            <p className="text-sm text-slate-400">Tracks projects, boosts career, improves productivity & wellbeing</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-300">{user.name || user.email}</div>
              <button
                className="px-3 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
                onClick={() => {
                  // in a real app call your backend to sign out
                  setUser(null);
                  setStatuses(INTEGRATIONS.reduce((acc, it) => ({ ...acc, [it.id]: { connected: false } }), {}));
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
                onClick={() => setShowAuth(true)}
              >
                Sign in / Sign up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto p-6">
        <section className="bg-neutral-900 rounded-2xl p-8 mb-6 border border-neutral-800 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold">Welcome{user ? `, ${user.name || user.email}` : "!"}</h2>
              <p className="text-slate-400 mt-2 max-w-xl">Connect your tools and start automating project tracking, career updates, scheduling, collaboration, and mood journaling — all from one place.</p>

              <div className="mt-4 flex gap-3">
                <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold">Create project</button>
                <button className="px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm" onClick={() => document.getElementById('integrations')?.scrollIntoView({ behavior: 'smooth' })}>View integrations</button>
              </div>
            </div>

            <div className="w-full md:w-96 bg-gradient-to-br from-neutral-950 to-neutral-900 p-4 rounded-xl border border-neutral-800">
              <h3 className="text-sm text-slate-300">Quick actions</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>- Sync GitHub repos to create project boards</li>
                <li>- Publish LinkedIn update after a release</li>
                <li>- Schedule weekly learning sessions on YouTube</li>
                <li>- Auto-create Google Meet when you set 'Focus time' on Calendar</li>
                <li>- Start a mood journal entry in Notion</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Integrations grid */}
        <section id="integrations" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATIONS.map((it) => (
            <div key={it.id} className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center font-semibold text-sm">{it.label[0]}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{it.label}</h4>
                    <div className={`text-xs px-2 py-1 rounded-full ${statuses[it.id]?.connected ? 'bg-emerald-700 text-white' : 'bg-neutral-800 text-slate-400'}`}>
                      {statuses[it.id]?.connected ? 'Connected' : 'Not connected'}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">{describeIntegration(it.id)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">Last sync: {statuses[it.id]?.lastSync || '—'}</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={connecting === it.id}
                    className="px-3 py-1 rounded-lg bg-indigo-600 text-sm disabled:opacity-60"
                    onClick={() => connectIntegration(it.id)}
                  >
                    {statuses[it.id]?.connected ? 'Reconnect' : 'Connect'}
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
                    onClick={() => alert('This would open integration settings (not implemented)')}
                  >
                    Settings
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-8 text-center text-slate-500 text-sm">Made with ❤️ — connect the tools you love and be more productive</footer>
      </main>

      {/* Descope embedded flow modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-neutral-900 rounded-2xl shadow-xl border border-neutral-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sign in / Sign up</h3>
              <button className="text-slate-400" onClick={() => setShowAuth(false)}>Close</button>
            </div>

            <div>
              <Descope
                projectId={PROJECT_ID}
                flowId="sign-up-or-in"
                theme="dark"
                onSuccess={handleAuthSuccess}
                onError={(err) => console.error("Descope error", err)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function describeIntegration(id) {
  switch (id) {
    case "github":
      return "Sync repos, create project boards from issues, and push releases.";
    case "notion":
      return "Link project pages and keep a mood journal in Notion.";
    case "linkedin":
      return "Post release notes and career updates to LinkedIn automatically.";
    case "youtube":
      return "Schedule learning playlists and track progress from YouTube.";
    case "gcalendar":
      return "Create events and focus time that can open Google Meet links.";
    case "gmail":
      return "Send summary emails and task reminders from the app.";
    case "slack":
      return "Share updates and receive notifications in your workspace.";
    case "discord":
      return "Send bot notifications to your channels for releases and reminders.";
    case "gmeet":
      return "Quickly create Meet links when creating meetings from the app.";
    case "spotify":
      return "Play curated playlists while you work and track mood-linked music.";
    default:
      return "Integration description.";
  }
}
