// FILE: src/pages/RepoOverview.jsx
import React, { useState } from "react";
import { useRepo } from "./RepoRouter";
import { motion } from "framer-motion";
import ConnectPanel from "../components/ConnectPanel";
import { useUser } from "@descope/react-sdk";

export default function RepoOverview() {
  const { details, loading, error, repoName, setDetails } = useRepo();
  const { user } = useUser();

  const [descSuggestion, setDescSuggestion] = useState("");
  const [descLoading, setDescLoading] = useState(false);

  React.useEffect(() => {
    if (!details?.description && !descSuggestion && !descLoading) {
      fetchDescriptionSuggestion();
    }
    // eslint-disable-next-line
  }, [details?.description, repoName, user?.userId]);

  if (loading) return <div className="p-6 text-gray-300">Loading repository...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!details) return <div className="p-6 text-gray-400">Repository details unavailable.</div>;
  
  async function fetchDescriptionSuggestion() {
    if (descLoading) return;
    setDescLoading(true);
    setDescSuggestion("");
    try {
      const res = await fetch("http://localhost:5000/api/github/description-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user?.userId, repoName }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || `Server ${res.status}`);
      setDescSuggestion(payload.suggested || "");
    } catch (e) {
      console.error("description-suggest failed", e);
      setDescSuggestion("Failed to generate description.");
    } finally {
      setDescLoading(false);
    }
  }

  async function applyDescription() {
    if (descLoading || !descSuggestion) return;
    setDescLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/github/description-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user?.userId, repoName, description: descSuggestion }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || `Server ${res.status}`);
      if (setDetails) {
        setDetails(d => ({ ...(d || {}), description: descSuggestion }));
      }
      setDescSuggestion("");
    } catch (e) {
      console.error("applyDescription failed", e);
    } finally {
      setDescLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-xl p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
        <h2 className="text-xl font-semibold mb-3">Description</h2>
        <div className="mb-6">
          {details?.description ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-gray-200 text-lg mb-6">{details.description}</motion.p>
          ) : descSuggestion ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-3 bg-gray-800/60 p-4 rounded-xl border border-pink-600/30">
              <div className="text-sm text-gray-200">{descSuggestion}</div>
              <div className="mt-4 flex gap-2">
                <button onClick={applyDescription} disabled={descLoading} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50">{descLoading ? "Applying..." : "Apply"}</button>
                <button onClick={fetchDescriptionSuggestion} disabled={descLoading} className="px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50">{descLoading ? "Regenerating..." : "Regenerate"}</button>
              </div>
            </motion.div>
          ) : (
            <div className="mt-3">
              <div className="text-gray-400 mb-3">{descLoading ? "Generating description..." : "No description available."}</div>
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-2">Languages</h3>
        {details.languages?.length ? <div className="flex flex-wrap gap-2">{details.languages.map(l=> <span key={l} className="px-3 py-1 rounded-full bg-indigo-700/80 text-white text-sm">{l}</span>)}</div> : <div className="text-gray-400">No language data.</div>}

        <h3 className="text-lg font-semibold mt-4 mb-2">Frameworks</h3>
        {details.frameworks?.length ? <div className="flex flex-wrap gap-2">{details.frameworks.map(f=> <span key={f} className="px-3 py-1 rounded-full bg-pink-700/80 text-white text-sm">{f}</span>)}</div> : <div className="text-gray-400">No framework data.</div>}
      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-24">
          <ConnectPanel layout="vertical" />
        </div>
      </aside>
    </motion.div>
  );
}
