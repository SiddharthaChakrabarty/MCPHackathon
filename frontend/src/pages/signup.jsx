// src/FirstPageGitHubFirst.jsx
import React, { useEffect, useState } from "react";
import { Descope, useDescope, getSessionToken } from "@descope/react-sdk";

// FirstPage (GitHub-first onboarding) — auth fully wired
// - Uses Descope React SDK to sign in (Descope Flow component)
// - After a successful sign-in we grab the Descope session token (getSessionToken)
//   and POST it to the backend (/api/auth/session) to validate and establish a server session.
// - Client-side outbound.connect is used to connect the user's GitHub Outbound App via Descope.

const PROJECT_ID = process.env.REACT_APP_DESCOPE_PROJECT_ID || "P31EeCcDPtwQGyi9wbZk4ZLKKE5a";
const OUTBOUND_GITHUB_APP_ID = process.env.REACT_APP_DESCOPE_OUTBOUND_GITHUB || ""; // set in .env
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

export default function FirstPageGitHubFirst() {
    const { sdk } = useDescope();
    const [showAuth, setShowAuth] = useState(false);
    const [user, setUser] = useState(null); // { name, email, id? }
    const [repos, setRepos] = useState([]);
    const [selected, setSelected] = useState({});
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [recs, setRecs] = useState(null);
    const [connecting, setConnecting] = useState(false);

    // On mount: if there's a Descope session token in client storage, validate it server-side
    useEffect(() => {
        (async () => {
            try {
                const token = await getSessionToken();
                if (token) {
                    const res = await fetch(`${API_BASE}/api/auth/session`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                    });
                    if (res.ok) {
                        const js = await res.json();
                        setUser(js.user);
                    }
                }
            } catch (e) {
                // ignore - user not signed in
            }
        })();
    }, []);

    // Called when Descope component reports success
    async function handleAuthSuccess(e) {
        // e.detail.user is useful client-side; to make the backend aware we must send the session token
        setUser(e.detail?.user || e.detail || { name: 'Unknown', email: 'unknown@' });

        try {
            const token = await getSessionToken();
            if (token) {
                const res = await fetch(`${API_BASE}/api/auth/session`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                if (res.ok) {
                    const js = await res.json();
                    setUser(js.user);
                } else {
                    console.warn('Server session validation failed');
                }
            }
        } catch (err) {
            console.error('Failed to validate session with backend', err);
        }

        setShowAuth(false);
    }

    // Sign out both client (Descope SDK) and server session
    async function signOut() {
        try {
            if (sdk && sdk.auth && typeof sdk.auth.logout === 'function') await sdk.auth.logout();
        } catch (e) {
            // ignore
        }
        await fetch(`${API_BASE}/api/auth/signout`, { method: 'POST', credentials: 'include' });
        setUser(null);
        setRepos([]);
        setRecs(null);
    }

    // Open GitHub connect using client-side Descope outbound flow (preferred)
    async function openGithubConnect() {
        setConnecting(true);
        try {
            if (!sdk) throw new Error('Descope SDK not ready');
            if (!OUTBOUND_GITHUB_APP_ID) throw new Error('OUTBOUND_GITHUB_APP_ID not configured (set REACT_APP_DESCOPE_OUTBOUND_GITHUB)');

            await sdk.outbound.connect(OUTBOUND_GITHUB_APP_ID, {
                redirectURL: window.location.origin + '/?connected=github',
                scopes: ['repo', 'read:user']
            });

            // Many SDKs will redirect automatically. If not, the call above may return an object.
        } catch (clientErr) {
            console.warn('Client-side Descope connect failed — falling back to server-start flow', clientErr);
            try {
                // try server-initiated connect (server will need refreshJWT or other auth)
                const refreshJWT = (sdk && sdk.auth && typeof sdk.auth.getRefreshJWT === 'function') ? await sdk.auth.getRefreshJWT() : null;
                const res = await fetch(`${API_BASE}/api/outbound/connect`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ providerId: OUTBOUND_GITHUB_APP_ID, redirectURL: window.location.origin + '/?connected=github', refreshJWT })
                });
                const js = await res.json();
                if (js.url) window.location.href = js.url;
                else throw new Error(js.error || 'No url returned by server');
            } catch (err) {
                console.error(err);
                alert('Failed to start GitHub connection: ' + (err.message || err));
                setConnecting(false);
            }
        }
    }

    // Fetch repos (server will use Descope-managed token if you pass appId & userId)
    async function fetchRepos() {
        setLoadingRepos(true);
        try {
            // try to get client user id from sdk
            let userId = null;
            try {
                const clientUser = (sdk && sdk.auth && typeof sdk.auth.getUser === 'function') ? await sdk.auth.getUser() : null;
                userId = clientUser?.id || clientUser?.userId || clientUser?.sub || clientUser?.uid || null;
            } catch (e) {
                // ignore
            }

            let url = `${API_BASE}/api/github/repos`;
            if (OUTBOUND_GITHUB_APP_ID && userId) url += `?appId=${encodeURIComponent(OUTBOUND_GITHUB_APP_ID)}&userId=${encodeURIComponent(userId)}`;

            const r = await fetch(url, { credentials: 'include' });
            if (!r.ok) throw new Error(await r.text());
            const js = await r.json();
            setRepos(js.repos || []);

            const pre = {};
            (js.repos || []).slice(0, 3).forEach((repo) => (pre[repo.name] = true));
            setSelected(pre);

            if (js.user) setUser(js.user);
        } catch (err) {
            console.error(err);
            alert(err.message || err);
        } finally {
            setLoadingRepos(false);
            setConnecting(false);
        }
    }

    function toggleRepo(name) {
        setSelected((s) => ({ ...s, [name]: !s[name] }));
    }

    async function getRecommendations() {
        const chosen = Object.keys(selected).filter((k) => selected[k]);
        if (!chosen.length) return alert('Please select at least one repo to get recommendations.');
        setRecs({ loading: true });
        try {
            const r = await fetch(`${API_BASE}/api/recommendations`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repos: chosen })
            });
            if (!r.ok) throw new Error('Failed to get recommendations');
            const js = await r.json();
            setRecs(js);
        } catch (err) {
            console.error(err);
            alert(err.message || err);
            setRecs(null);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-slate-100">
            <header className="max-w-6xl mx-auto p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center font-bold">CH</div>
                    <div>
                        <h1 className="text-xl font-semibold">CreatorHub — GitHub First</h1>
                        <p className="text-sm text-slate-400">Connect GitHub to receive curated learning paths, schedule time, and share progress.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-300">{user.name || user.email}</div>
                            <button className="px-3 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-sm" onClick={signOut}>Sign out</button>
                        </div>
                    ) : (
                        <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium" onClick={() => setShowAuth(true)}>Sign in / Sign up</button>
                    )}
                </div>
            </header>

            {/* main UI unchanged (omitted here for brevity in canvas) — keep same as before */}

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