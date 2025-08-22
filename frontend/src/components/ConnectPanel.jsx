// src/components/ConnectPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDescope } from "@descope/react-sdk";
import { SiGithub, SiYoutube, SiNotion, SiGoogle, SiSpotify, SiSlack } from "react-icons/si";

/**
 * ConnectPanel
 *
 * Props:
 *  - compact (bool) : reduces paddings if true
 *  - layout: 'auto'|'horizontal'|'vertical' (default 'auto')
 *
 * Behavior:
 *  - 'auto' chooses horizontal when window.innerWidth >= 1024
 *  - horizontal: responsive card grid with uniform card heights
 *  - vertical: stacked cards column
 *
 * Notes:
 *  - This component uses localStorage (key "connectedMap_v3") as a demo store.
 *  - When outbound.connect() sets a provider to "pending" and redirects away,
 *    upon returning the app will automatically convert any "pending" entries
 *    to "connected" (so the UI reflects completion).
 *  - Replace localStorage logic with a server-side status endpoint for production.
 */

export default function ConnectPanel({ compact = false, layout = "auto" }) {
    const sdk = useDescope();
    const navigate = useNavigate();

    // demo connection state stored locally (replace with server check in prod)
    const [connectedMap, setConnectedMap] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("connectedMap_v3") || "{}");
        } catch {
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("connectedMap_v3", JSON.stringify(connectedMap));
        } catch { }
    }, [connectedMap]);

    const connectors = useMemo(
        () => [
            { id: "github", title: "GitHub", description: "Analyze repos & detect languages", colorClass: "github-bg", Icon: SiGithub },
            { id: "youtube", title: "YouTube", description: "Curated tutorials & playlists", colorClass: "youtube-bg", Icon: SiYoutube },
            { id: "notion", title: "Notion", description: "Timetables & learning plans", colorClass: "notion-bg", Icon: SiNotion },
            { id: "google", title: "Google", description: "Calendar & Meet sync", colorClass: "google-bg", Icon: SiGoogle },
            { id: "spotify", title: "Spotify", description: "Playlists & break scheduling", colorClass: "spotify-bg", Icon: SiSpotify },
            { id: "slack", title: "Slack", description: "Team collaboration & channels", colorClass: "slack-bg", Icon: SiSlack },
        ],
        []
    );

    async function connectProvider(providerId) {
        try {
            const result = await sdk.outbound.connect(providerId, { redirectURL: window.location.href });
            if (result?.data?.url) {
                // mark pending before redirecting so we can detect completion on return
                setConnectedMap(prev => ({ ...prev, [providerId]: "pending" }));
                // store to localStorage explicitly (redundant with effect, but safe)
                try {
                    const raw = JSON.parse(localStorage.getItem("connectedMap_v3") || "{}");
                    raw[providerId] = "pending";
                    localStorage.setItem("connectedMap_v3", JSON.stringify(raw));
                } catch { }
                // redirect to provider OAuth page
                window.location.href = result.data.url;
            } else {
                console.error("outbound.connect missing url", result);
                alert("Unable to start connection flow. Check provider configuration.");
            }
        } catch (err) {
            console.error("connectProvider error", err);
            alert("Connection error: " + (err?.message || String(err)));
        }
    }

    // Promotion step: when the app loads/comes back into focus, convert any 'pending' -> 'connected'.
    // This handles the user returning from the OAuth flow (demo behavior).
    useEffect(() => {
        try {
            const raw = JSON.parse(localStorage.getItem("connectedMap_v3") || "{}");
            let updated = false;
            for (const k of Object.keys(raw)) {
                if (raw[k] === "pending") {
                    raw[k] = "connected";
                    updated = true;
                }
            }
            if (updated) {
                localStorage.setItem("connectedMap_v3", JSON.stringify(raw));
                setConnectedMap(raw);
            }
        } catch (e) {
            // ignore parse errors
        }
        // also listen for focus changes in case OAuth returns in another tab/window
        function onFocus() {
            try {
                const raw = JSON.parse(localStorage.getItem("connectedMap_v3") || "{}");
                let updated = false;
                for (const k of Object.keys(raw)) {
                    if (raw[k] === "pending") {
                        raw[k] = "connected";
                        updated = true;
                    }
                }
                if (updated) {
                    localStorage.setItem("connectedMap_v3", JSON.stringify(raw));
                    setConnectedMap(raw);
                }
            } catch { }
        }
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, []);

    function refreshConnections() {
        try {
            const raw = localStorage.getItem("connectedMap_v3");
            const parsed = raw ? JSON.parse(raw) : {};
            // demo: mark pending -> connected
            Object.keys(parsed).forEach(k => {
                if (parsed[k] === "pending") parsed[k] = "connected";
            });
            setConnectedMap(parsed);
            localStorage.setItem("connectedMap_v3", JSON.stringify(parsed));
        } catch (e) {
            console.error("refreshConnections failed", e);
        }
    }

    function clearConnections() {
        try {
            localStorage.removeItem("connectedMap_v3");
            setConnectedMap({});
        } catch (e) {
            console.error("clearConnections failed", e);
        }
    }

    // detect width for layout auto mode
    const [isWide, setIsWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
    useEffect(() => {
        function onResize() {
            setIsWide(window.innerWidth >= 1024);
        }
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const resolvedLayout = layout === "auto" ? (isWide ? "horizontal" : "vertical") : layout;
    const containerPadding = compact ? "p-3" : "p-4";
    const horizontalGridClass = "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";
    const cardMinHeightClass = resolvedLayout === "horizontal" ? "min-h-[140px]" : "";

    return (
        <div className={`rounded-2xl border border-gray-800/60 bg-gradient-to-br from-gray-900/75 to-gray-800/60 ${containerPadding} shadow-lg`}>
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h4 className="text-lg font-semibold text-gray-100">Integrations</h4>
                    <p className="text-sm text-gray-400 max-w-md mt-1">Connect services to surface recommendations, schedule events, and collaborate.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshConnections}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 border border-gray-700 rounded text-sm text-gray-200 hover:bg-gray-800/40 transition"
                        aria-label="Refresh connections"
                    >
                        Refresh
                    </button>

                    <button
                        onClick={clearConnections}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-700/20 border border-red-700 rounded text-sm text-red-300 hover:bg-red-700/10 transition"
                        aria-label="Clear demo connections"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {resolvedLayout === "horizontal" ? (
                <div className={`${horizontalGridClass}`}>
                    {connectors.map(conn => {
                        const status = connectedMap[conn.id];
                        const isConnected = status === "connected";
                        const isPending = status === "pending";
                        const Icon = conn.Icon;

                        return (
                            <div
                                key={conn.id}
                                className={`relative ${cardMinHeightClass} flex flex-col justify-between p-4 rounded-lg bg-gray-900/50 border border-gray-800/50`}
                            >
                                <div className="absolute top-3 right-3">
                                    {isConnected ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-700/80 text-emerald-50 text-xs">Connected</span>
                                    ) : isPending ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-600/80 text-yellow-50 text-xs">Pending</span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-700 text-gray-100 text-xs">Not connected</span>
                                    )}
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold shrink-0 ${conn.colorClass}`}>
                                        <Icon size={20} aria-hidden />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-100 truncate">{conn.title}</div>
                                        <div className="text-xs text-gray-400 mt-1 truncate">{conn.description}</div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-xs text-gray-400">Used for: <span className="text-gray-300">{conn.title === "google" ? "Calendar & Meet" : conn.title}</span></div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => connectProvider(conn.id)}
                                            className="px-3 py-2 rounded-md bg-gradient-to-r from-slate-800 to-slate-700 text-sm text-gray-100 font-semibold hover:brightness-105 transition"
                                            aria-label={`Connect ${conn.title}`}
                                            disabled={isPending}
                                        >
                                            Connect
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {connectors.map(conn => {
                        const status = connectedMap[conn.id];
                        const isConnected = status === "connected";
                        const isPending = status === "pending";
                        const Icon = conn.Icon;

                        return (
                            <div key={conn.id} className="flex gap-3 items-start p-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold shrink-0 ${conn.colorClass}`}>
                                    <Icon size={20} aria-hidden />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-gray-100">{conn.title}</div>
                                            <div className="text-xs text-gray-400 mt-1">{conn.description}</div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Status</div>
                                            <div className="mt-1">
                                                {isConnected ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-50 text-xs">Connected</span>
                                                ) : isPending ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-600/80 text-yellow-50 text-xs">Pending</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700 text-gray-100 text-xs">Not connected</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <button onClick={() => connectProvider(conn.id)} className="px-3 py-2 rounded-md bg-gradient-to-r from-slate-800 to-slate-700 text-sm text-gray-100 font-semibold" disabled={isPending}>Connect</button>
                                        <button onClick={() => navigate("/settings")} className="px-2 py-2 rounded border border-white/6 text-sm text-gray-300">Settings</button>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500">Used for: <span className="text-gray-300">{conn.title === "google" ? "Calendar & Meet" : conn.title}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* small CSS for icon backgrounds */}
            <style>{`
        .github-bg { background: linear-gradient(135deg,#0b1220,#0f172a); }
        .youtube-bg { background: linear-gradient(135deg,#e53935,#f59f00); }
        .notion-bg { background: linear-gradient(135deg,#0b1220,#2b2b2b); }
        .google-bg { background: linear-gradient(135deg,#059669,#06b6d4); }
        .spotify-bg { background: linear-gradient(135deg,#1db954,#a3e635); }
        .slack-bg { background: linear-gradient(135deg,#111827,#6d28d9); }
      `}</style>
        </div>
    );
}
