// src/components/ConnectPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDescope, useUser } from "@descope/react-sdk";
import { useNavigate } from "react-router-dom";

export default function ConnectPanel() {
    const sdk = useDescope();
    const { user } = useUser();
    const navigate = useNavigate();

    const [connectedMap, setConnectedMap] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("connectedMap_v1") || "{}");
        } catch {
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem("connectedMap_v1", JSON.stringify(connectedMap));
    }, [connectedMap]);

    const connectors = useMemo(
        () => [
            { id: "github", title: "GitHub", pigment: "from-gray-900 to-gray-700", description: "Detect languages, analyze repos, power recommendations", action: "Connect GitHub" },
            { id: "youtube", title: "YouTube", pigment: "from-red-600 to-yellow-400", description: "Get curated tutorials and create playlists", action: "Connect YouTube" },
            { id: "linkedin", title: "LinkedIn", pigment: "from-blue-800 to-blue-500", description: "Post project updates and discover job leads", action: "Connect LinkedIn" },
            { id: "notion", title: "Notion", pigment: "from-black to-gray-700", description: "Generate timetables, notes and tasks", action: "Connect Notion" },
            { id: "google", title: "Google", pigment: "from-green-700 to-cyan-500", description: "Sync calendar events & create Meet links", action: "Connect Google" },
            { id: "spotify", title: "Spotify", pigment: "from-green-600 to-lime-400", description: "Create focus+break playlists and sync breaks", action: "Connect Spotify" },
            { id: "slack", title: "Slack", pigment: "from-gray-800 to-indigo-600", description: "Share updates and invite collaborators", action: "Connect Slack" },
            { id: "discord", title: "Discord", pigment: "from-indigo-700 to-purple-500", description: "Join/host study servers and coordinate meetups", action: "Connect Discord" }
        ],
        []
    );

    async function connectProvider(providerId) {
        try {
            const result = await sdk.outbound.connect(providerId, { redirectURL: window.location.href });
            if (result && result.data && result.data.url) {
                setConnectedMap(prev => ({ ...prev, [providerId]: "pending" }));
                // redirect to start OAuth flow
                window.location.href = result.data.url;
            } else {
                console.error("No URL from outbound.connect", result);
                alert("Could not start provider flow. Check Descope config.");
            }
        } catch (e) {
            console.error("connect error", e);
            alert("Failed to start connect flow: " + (e?.message || e));
        }
    }

    // demo helpers
    function markConnected(providerId) { setConnectedMap(prev => ({ ...prev, [providerId]: "connected" })); }
    function markDisconnected(providerId) { setConnectedMap(prev => { const c = { ...prev }; delete c[providerId]; return c; }); }

    function refreshConnections() {
        try {
            const raw = localStorage.getItem("connectedMap_v1");
            if (raw) setConnectedMap(JSON.parse(raw));
            alert("Refreshed (demo-only). In production call backend to verify tokens.");
        } catch { alert("Refresh failed."); }
    }

    return (
        <div className="p-4 bg-white/5 rounded-2xl border border-white/8 shadow-md">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h4 className="font-semibold text-white mb-1 text-lg">Connect services</h4>
                    <p className="text-gray-300 text-sm max-w-sm">Connect services to enable repository analysis, curated learning, scheduling, posting updates and collaboration.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={refreshConnections} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Refresh</button>
                    <button onClick={() => { localStorage.removeItem("connectedMap_v1"); setConnectedMap({}); }} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Clear</button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {connectors.map(conn => {
                    const status = connectedMap[conn.id];
                    const isConnected = status === "connected";
                    const isPending = status === "pending";

                    return (
                        <div key={conn.id} className="bg-black/55 p-3 rounded-lg border border-white/6 shadow-sm">
                            <div className="flex gap-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold bg-gradient-to-br ${conn.pigment} flex-shrink-0`}>
                                    {conn.title.slice(0, 2).toUpperCase()}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold text-white">{conn.title}</div>
                                            <div className="text-xs text-gray-400 mt-1">{conn.description}</div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Status</div>
                                            <div className="mt-1">
                                                {isConnected ? (<span className="px-2 py-1 rounded-full bg-green-700 text-white text-xs">Connected</span>)
                                                    : isPending ? (<span className="px-2 py-1 rounded-full bg-yellow-700 text-white text-xs">Pending</span>)
                                                        : (<span className="px-2 py-1 rounded-full bg-gray-700 text-white text-xs">Not connected</span>)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <button onClick={() => connectProvider(conn.id)} className="px-3 py-2 rounded bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-sm font-semibold shadow">
                                            {conn.action}
                                        </button>

                                        <button onClick={() => (isConnected ? markDisconnected(conn.id) : markConnected(conn.id))} className="px-2 py-2 rounded bg-white/6 text-white text-sm">
                                            {isConnected ? "Unmark" : "Mark"}
                                        </button>

                                        <button onClick={() => navigate("/settings")} className="px-2 py-2 rounded border border-white/6 text-sm text-gray-300">Settings</button>
                                    </div>

                                    <div className="mt-3 text-xs text-gray-500">Used for: <span className="text-gray-300">{conn.title === "google" ? "Calendar & Meet" : conn.title}</span></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* non-blocking decorative flow bar */}
            <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/6 text-sm text-gray-300 pointer-events-none select-none">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400" />Connect</div>
                    <div className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M5 12h8M13 12l-3-3M13 12l-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>Orchestrate</div>
                    <div className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>Schedule & Share</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400" />Learn & Collab</div>
                </div>
            </div>
        </div>
    );
}
