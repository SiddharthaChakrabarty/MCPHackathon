
// FILE: src/pages/RepoCollaborators.jsx
import React, { useEffect, useState } from "react";
import { useRepo } from "./RepoRouter";
import { useUser } from "@descope/react-sdk";

export default function RepoCollaborators() {
  const { repoName } = useRepo();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/api/github/repo/collaborators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
  }, [repoName]);

  return (
    <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
      <h2 className="text-xl font-semibold mb-4">Collaborators</h2>
      {loading ? <div className="text-gray-300">Loading collaborators...</div> : (
        collaborators.length === 0 ? <div className="text-gray-400">No collaborators found or you do not have access.</div> : (
          <div className="flex flex-wrap gap-4">
            {collaborators.map(c => (
              <div key={c.login} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-700/80 to-pink-700/80 text-white font-semibold shadow">
                <img src={c.avatar_url} alt={c.login} className="w-8 h-8 rounded-full border border-gray-700" />
                <a href={c.html_url} target="_blank" rel="noreferrer" className="hover:underline">{c.login}</a>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}