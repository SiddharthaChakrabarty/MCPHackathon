// src/components/ConnectPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDescope, useUser, useSession } from "@descope/react-sdk";
import {
    SiGithub,
    SiYoutube,
    SiNotion,
    SiGoogle,
    SiSpotify,
    SiSlack,
    SiDiscord,
    SiLinkedin,
} from "react-icons/si";

/**
 * ConnectPanel (supports github, youtube, notion, google-meet, google-calendar, spotify, slack, discord, linkedin)
 *
 * LocalStorage keys:
 * - connectedMap_v3
 * - promotedProviders_v1
 * - linkedProviders_v1
 *
 * Important: Create matching Descope outbound appIds for:
 *   - google-meet
 *   - google-calendar
 * (or map these ids to whatever your Descope outbound appIds are)
 *
 * NOTE: This component only enqueues and calls your backend /api/outbound/link-provider.
 * Backend must support provider ids used here.
 */

export default function ConnectPanel({
    compact = false,
    layout = "auto",
    connectedMap: connectedMapProp,
    setConnectedMap: setConnectedMapProp,
}) {
    const sdk = useDescope();
    const navigate = useNavigate();
    const { user } = useUser();
    const { isAuthenticated } = useSession();

    const [localConnectedMap, setLocalConnectedMap] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("connectedMap_v3") || "{}");
        } catch {
            return {};
        }
    });

    const connectedMap = connectedMapProp ?? localConnectedMap;
    const setConnectedMap = setConnectedMapProp ?? setLocalConnectedMap;

    useEffect(() => {
        try {
            localStorage.setItem("connectedMap_v3", JSON.stringify(connectedMap));
        } catch { }
    }, [connectedMap]);

    const connectors = useMemo(
        () => [
            { id: "github", title: "GitHub", description: "Analyze repos & detect languages", colorClass: "github-bg", Icon: SiGithub },
            { id: "youtube", title: "YouTube", description: "Curated tutorials & playlists", colorClass: "youtube-bg", Icon: SiYoutube },

            { id: "google-calendar", title: "Google Calendar", description: "Calendar events & availability", colorClass: "google-bg", Icon: SiGoogle },
            { id: "google-drive", title: "Google Drive", description: "Save curated docs & resources", colorClass: "google-drive-bg", Icon: SiGoogle },

            { id: "slack", title: "Slack", description: "Team collaboration & channels", colorClass: "slack-bg", Icon: SiSlack },
            { id: "linkedin", title: "LinkedIn", description: "Professional profile & network", colorClass: "linkedin-bg", Icon: SiLinkedin },
            // REMOVED: google-meet and discord
        ],
        []
    );

    async function connectProvider(providerId) {
        try {
            const result = await sdk.outbound.connect(providerId, { redirectURL: window.location.href });
            if (result?.data?.url) {
                // mark pending in both state and localStorage
                setConnectedMap(prev => ({ ...prev, [providerId]: "pending" }));
                try {
                    const raw = JSON.parse(localStorage.getItem("connectedMap_v3") || "{}");
                    raw[providerId] = "pending";
                    localStorage.setItem("connectedMap_v3", JSON.stringify(raw));
                } catch { }
                // redirect to OAuth provider
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

    // backend linking call
    async function linkProviderToDb(providerId, descopeUserId, email) {
        if (!descopeUserId && !email) return { ok: false, error: "no user id or email" };
        try {
            const res = await fetch("https://mcp-hackathon-7buc.vercel.app/api/outbound/link-provider", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    descopeUserId,
                    email,
                }),
            });
            const j = await res.json();
            if (!res.ok) {
                console.warn("linkProviderToDb failed:", j);
                return { ok: false, error: j };
            } else {
                console.log("Linked provider saved:", j);
                return { ok: true, data: j };
            }
        } catch (e) {
            console.error("linkProviderToDb error", e);
            return { ok: false, error: e };
        }
    }

    // queue helpers
    function enqueuePromotedProviders(ids = []) {
        try {
            const cur = JSON.parse(localStorage.getItem("promotedProviders_v1") || "[]");
            const set = new Set(cur.concat(ids));
            const arr = Array.from(set);
            localStorage.setItem("promotedProviders_v1", JSON.stringify(arr));
            return arr;
        } catch {
            localStorage.setItem("promotedProviders_v1", JSON.stringify(ids));
            return ids;
        }
    }
    function dequeuePromotedProviders() { try { localStorage.removeItem("promotedProviders_v1"); } catch { } }
    function markProviderLinked(providerId) {
        try {
            const cur = JSON.parse(localStorage.getItem("linkedProviders_v1") || "[]");
            if (!cur.includes(providerId)) { cur.push(providerId); localStorage.setItem("linkedProviders_v1", JSON.stringify(cur)); }
        } catch { localStorage.setItem("linkedProviders_v1", JSON.stringify([providerId])); }
    }
    function isProviderLinked(providerId) {
        try { const cur = JSON.parse(localStorage.getItem("linkedProviders_v1") || "[]"); return cur.includes(providerId); } catch { return false; }
    }

    // promote pending -> connected, enqueue for linking
    function promotePendingToConnectedAndQueueLinking() {
        try {
            const raw = JSON.parse(localStorage.getItem("connectedMap_v3") || "{}");
            const pendingKeys = Object.keys(raw).filter(k => raw[k] === "pending");
            if (pendingKeys.length === 0) { setConnectedMap(raw); return; }
            for (const k of pendingKeys) raw[k] = "connected";
            localStorage.setItem("connectedMap_v3", JSON.stringify(raw));
            setConnectedMap(raw);

            const enqueued = enqueuePromotedProviders(pendingKeys);
            console.log("Promoted connections (queued):", enqueued);

            if (isAuthenticated && user && (user.userId || user.email)) {
                consumePromotedQueueAndLink();
            }
        } catch (e) {
            console.error("promote error", e);
        }
    }

    async function consumePromotedQueueAndLink() {
        try {
            const queued = JSON.parse(localStorage.getItem("promotedProviders_v1") || "[]");
            if (!queued || queued.length === 0) return;
            const toLink = queued.filter(p => !isProviderLinked(p));
            if (toLink.length === 0) { dequeuePromotedProviders(); return; }

            if (!(isAuthenticated && user && (user.userId || user.email))) {
                console.log("User not ready yet; will try later.");
                return;
            }

            for (const providerId of toLink) {
                const res = await linkProviderToDb(providerId, user.userId, user.email);
                if (res.ok) {
                    markProviderLinked(providerId);
                } else {
                    console.warn("Link attempt failed for", providerId, res.error);
                }
            }

            const stillQueued = JSON.parse(localStorage.getItem("promotedProviders_v1") || "[]").filter(p => !isProviderLinked(p));
            if (stillQueued.length === 0) dequeuePromotedProviders();
            else localStorage.setItem("promotedProviders_v1", JSON.stringify(stillQueued));
        } catch (e) {
            console.error("consumePromotedQueueAndLink failed", e);
        }
    }

    useEffect(() => {
        promotePendingToConnectedAndQueueLinking();
        function onFocus() { promotePendingToConnectedAndQueueLinking(); }
        function onStorage(e) { if (e.key === "connectedMap_v3" || e.key === "promotedProviders_v1") promotePendingToConnectedAndQueueLinking(); }
        window.addEventListener("focus", onFocus);
        window.addEventListener("storage", onStorage);
        return () => { window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onStorage); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isAuthenticated && user && (user.userId || user.email)) {
            console.log("User became available - attempting to link queued providers", user.userId, user.email);
            consumePromotedQueueAndLink();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user]);

    function refreshConnections() {
        try {
            const raw = localStorage.getItem("connectedMap_v3");
            const parsed = raw ? JSON.parse(raw) : {};
            const pendingKeys = Object.keys(parsed).filter(k => parsed[k] === "pending");
            Object.keys(parsed).forEach(k => { if (parsed[k] === "pending") parsed[k] = "connected"; });
            setConnectedMap(parsed);
            localStorage.setItem("connectedMap_v3", JSON.stringify(parsed));

            if (pendingKeys.length > 0) {
                enqueuePromotedProviders(pendingKeys);
                if (isAuthenticated && user && (user.userId || user.email)) consumePromotedQueueAndLink();
            }
        } catch (e) {
            console.error("refreshConnections failed", e);
        }
    }

    function clearConnections() {
        try {
            localStorage.removeItem("connectedMap_v3");
            localStorage.removeItem("promotedProviders_v1");
            setConnectedMap({});
        } catch (e) {
            console.error("clearConnections failed", e);
        }
    }

    const [isWide, setIsWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
    useEffect(() => {
        function onResize() { setIsWide(window.innerWidth >= 1024); }
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
                    <button onClick={refreshConnections} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 border border-gray-700 rounded text-sm text-gray-200 hover:bg-gray-800/40 transition">Refresh</button>
                    <button onClick={clearConnections} className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-700/20 border border-red-700 rounded text-sm text-red-300 hover:bg-red-700/10 transition">Clear</button>
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
                            <div key={conn.id} className={`relative ${cardMinHeightClass} flex flex-col justify-between p-4 rounded-lg bg-gray-900/50 border border-gray-800/50`}>
                                <div className="absolute top-3 right-3">
                                    {isConnected ? <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-700/80 text-emerald-50 text-xs">Connected</span>
                                        : isPending ? <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-600/80 text-yellow-50 text-xs">Pending</span>
                                            : <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-700 text-gray-100 text-xs">Not connected</span>}
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
                                    <div className="text-xs text-gray-400">Used for: <span className="text-gray-300">{conn.title}</span></div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={() => connectProvider(conn.id)} className="px-3 py-2 rounded-md bg-gradient-to-r from-slate-800 to-slate-700 text-sm text-gray-100 font-semibold hover:brightness-105 transition" aria-label={`Connect ${conn.title}`} disabled={isPending}>Connect</button>
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
                                                {isConnected ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-50 text-xs">Connected</span>
                                                    : isPending ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-600/80 text-yellow-50 text-xs">Pending</span>
                                                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700 text-gray-100 text-xs">Not connected</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <button onClick={() => connectProvider(conn.id)} className="px-3 py-2 rounded-md bg-gradient-to-r from-slate-800 to-slate-700 text-sm text-gray-100 font-semibold" disabled={isPending}>Connect</button>
                                        <button onClick={() => navigate("/settings")} className="px-2 py-2 rounded border border-white/6 text-sm text-gray-300">Settings</button>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500">Used for: <span className="text-gray-300">{conn.title}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
        .github-bg { background: linear-gradient(135deg,#0b1220,#0f172a); }
        .youtube-bg { background: linear-gradient(135deg,#e53935,#f59f00); }
        .notion-bg { background: linear-gradient(135deg,#0b1220,#2b2b2b); }
        .google-bg { background: linear-gradient(135deg,#059669,#06b6d4); }
        .spotify-bg { background: linear-gradient(135deg,#1db954,#a3e635); }
        .slack-bg { background: linear-gradient(135deg,#111827,#6d28d9); }
        .discord-bg { background: linear-gradient(135deg,#7289da,#99aab5); }
        .linkedin-bg { background: linear-gradient(135deg,#0e76a8,#2b6ea5); }
        .google-drive-bg { background: linear-gradient(135deg,#0f9d58,#34a853); }

      `}</style>
        </div>
    );
}
