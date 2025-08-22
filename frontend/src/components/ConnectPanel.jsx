/* ---------------------------------------------------------------------------
  Files in this document:
  - src/components/ConnectPanel.jsx
  - src/pages/Home.jsx
  - src/pages/GithubDetails.jsx

  CHANGELOG for this update:
  - ConnectPanel no longer uses a horizontal scrollbar.
  - When placed full-width (layout="horizontal") items will wrap into multiple rows (responsive: 1 / 2 / 3 / 4+ columns) so there is never a scrollbar.
  - When placed in a sidebar (layout="vertical") items stack one-per-row.
--------------------------------------------------------------------------------*/

/* ----------------------------- src/components/ConnectPanel.jsx ----------------------------- */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDescope } from '@descope/react-sdk';
import { SiGithub, SiYoutube, SiNotion, SiGoogle, SiSpotify, SiSlack } from 'react-icons/si';

export default function ConnectPanel({ compact = false, layout = 'auto' }) {
  const sdk = useDescope();
  const navigate = useNavigate();

  const [connectedMap, setConnectedMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('connectedMap_v2') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('connectedMap_v2', JSON.stringify(connectedMap));
    } catch {}
  }, [connectedMap]);

  const connectors = useMemo(() => [
    { id: 'github', title: 'GitHub', colorClass: 'github-bg', description: 'Analyze repos', action: 'Connect', Icon: SiGithub },
    { id: 'youtube', title: 'YouTube', colorClass: 'youtube-bg', description: 'Curated tutorials & playlists', action: 'Connect', Icon: SiYoutube },
    { id: 'notion', title: 'Notion', colorClass: 'notion-bg', description: 'Notes, tasks & timetables', action: 'Connect', Icon: SiNotion },
    { id: 'google', title: 'Google', colorClass: 'google-bg', description: 'Calendar & Meet sync', action: 'Connect', Icon: SiGoogle },
    { id: 'spotify', title: 'Spotify', colorClass: 'spotify-bg', description: 'Focus playlists & breaks', action: 'Connect', Icon: SiSpotify },
    { id: 'slack', title: 'Slack', colorClass: 'slack-bg', description: 'Team collaboration & updates', action: 'Connect', Icon: SiSlack },
  ], []);

  async function connectProvider(providerId) {
    try {
      const result = await sdk.outbound.connect(providerId, { redirectURL: window.location.href });
      if (result?.data?.url) {
        setConnectedMap(prev => ({ ...prev, [providerId]: 'pending' }));
        window.location.href = result.data.url;
      } else {
        console.error('outbound.connect did not return url', result);
        alert('Unable to start connection flow. Check configuration.');
      }
    } catch (err) {
      console.error('connectProvider error', err);
      alert(`Connection error: ${err?.message ?? String(err)}`);
    }
  }

  function refreshConnections() {
    try {
      const raw = localStorage.getItem('connectedMap_v2');
      const parsed = raw ? JSON.parse(raw) : {};
      Object.keys(parsed).forEach(k => { if (parsed[k] === 'pending') parsed[k] = 'connected'; });
      setConnectedMap(parsed);
      localStorage.setItem('connectedMap_v2', JSON.stringify(parsed));
    } catch (e) {
      console.error('refreshConnections failed', e);
    }
  }

  function clearConnections() {
    try {
      localStorage.removeItem('connectedMap_v2');
      setConnectedMap({});
    } catch (e) {
      console.error('clear failed', e);
    }
  }

  // Decide layout mode (auto => horizontal on wide screens, vertical otherwise)
  const [isWide, setIsWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  useEffect(() => {
    function onResize() { setIsWide(window.innerWidth >= 1024); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const resolvedLayout = layout === 'auto' ? (isWide ? 'horizontal' : 'vertical') : layout;

// Use grid layout:
const itemsContainerClass = resolvedLayout === 'horizontal'
  ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
  : 'flex flex-col gap-3';

const itemBaseClass = 'h-full';

  return (
    <div className={`rounded-2xl border border-gray-800/60 bg-gradient-to-br from-gray-900/75 to-gray-800/60 ${compact ? 'p-3' : 'p-4'} shadow-lg`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-100">Integrations</h4>
          <p className="text-sm text-gray-400 max-w-xs mt-1">Connect services to surface recommendations, sync calendar events and enable collaboration.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={refreshConnections} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 border border-gray-700 rounded text-sm text-gray-200 hover:bg-gray-800/40 transition" aria-label="Refresh connections">Refresh</button>

          <button onClick={clearConnections} className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-700/20 border border-red-700 rounded text-sm text-red-300 hover:bg-red-700/10 transition" aria-label="Clear demo connections">Clear</button>
        </div>
      </div>

      <div className={itemsContainerClass} role="list">
        {connectors.map(conn => {
          const status = connectedMap[conn.id];
          const displayConnected = status === 'connected' || status === 'pending';
          const Icon = conn.Icon;

          return (
            <div key={conn.id} role="listitem" className={`${itemBaseClass} flex gap-3 items-start p-3 rounded-lg bg-gray-900/50 border border-gray-800/50`}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold shrink-0 ${conn.colorClass}`} aria-hidden>
                <Icon size={20} aria-hidden />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-100 truncate">{conn.title}</div>
                    <div className="text-xs text-gray-400 mt-1 truncate">{conn.description}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400">Status</div>
                    <div className="mt-1">
                      {displayConnected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-50 text-xs">Connected</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700 text-gray-100 text-xs">Not connected</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => connectProvider(conn.id)} className="px-3 py-2 rounded-md bg-gradient-to-r from-slate-800 to-slate-700 text-sm text-gray-100 font-semibold hover:brightness-105 transition" aria-label={`Connect ${conn.title}`}>{conn.action}</button>
                </div>

                <div className="mt-2 text-xs text-gray-500">Used for: <span className="text-gray-300">{conn.title === 'google' ? 'Calendar & Meet' : conn.title}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .github-bg { background: linear-gradient(135deg,#0f172a,#0b1220); }
        .youtube-bg { background: linear-gradient(135deg,#e53935,#fbc02d); }
        .notion-bg { background: linear-gradient(135deg,#0f172a,#262626); }
        .google-bg { background: linear-gradient(135deg,#059669,#06b6d4); }
        .spotify-bg { background: linear-gradient(135deg,#1db954,#a3e635); }
        .slack-bg { background: linear-gradient(135deg,#111827,#4f46e5); }
      `}</style>
    </div>
  );
}