// FILE: src/pages/RepoOverview.jsx
import React, { useState } from "react";
import { useRepo } from "./RepoRouter";
import { motion } from "framer-motion";
import ConnectPanel from "../components/ConnectPanel";
import { useUser } from "@descope/react-sdk";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function RepoOverview() {
  const { details, loading, error, repoName, setDetails } = useRepo();
  const { user } = useUser();

  const [descSuggestion, setDescSuggestion] = useState("");
  const [descLoading, setDescLoading] = useState(false);

  // --- Add these state vars near the other useState calls at the top ---
  const [isOpenSource, setIsOpenSource] = useState(true); // default true, user can change
  const [features, setFeatures] = useState([]); // [{ id, title, description, selected }]
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [creatingIssues, setCreatingIssues] = useState(false);
  const [issueResults, setIssueResults] = useState(null);

    // README state
  const [readmeContent, setReadmeContent] = useState("");            // README from repo, if any
  const [readmeExists, setReadmeExists] = useState(null);            // null = unknown, true/false
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [suggestedReadme, setSuggestedReadme] = useState("");
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [applyingReadme, setApplyingReadme] = useState(false);


  // --- Add this function somewhere in the component (API call to generate features) ---
  async function handleGenerateFeatures() {
    if (!user?.userId) {
      toast.dark("Please sign in to generate feature ideas.");
      return;
    }
    setFeaturesLoading(true);
    setFeatures([]);
    setIssueResults(null);
    try {
      const res = await fetch("http://localhost:5000/api/github/features/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.userId,
          repoName,
          openSource: !!isOpenSource
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server error ${res.status}: ${txt}`);
      }
      const payload = await res.json();
      // Expecting payload.features = [{ title, description, id }]
      const items = (payload.features || []).map((f, idx) => ({
        id: f.id || `${Date.now()}-${idx}`,
        title: f.title || `Feature ${idx + 1}`,
        description: f.description || "",
        selected: true
      }));
      setFeatures(items);
      toast.success(`Generated ${items.length} feature ideas.`);
    } catch (err) {
      console.error("generate features error", err);
      toast.error("Failed to generate features: " + (err.message || err));
    } finally {
      setFeaturesLoading(false);
    }
  }

  // --- Toggle selection for a feature ---
  function toggleFeatureSelected(id) {
    setFeatures(fs => fs.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  }

  // --- Create GitHub issues for selected features ---
  async function handleCreateSelectedIssues() {
    if (!user?.userId) {
      toast.dark("Please sign in to create issues.");
      return;
    }
    const toCreate = features.filter((f) => f.selected);
    if (!toCreate.length) {
      toast.dark("Select one or more features to create as issues.");
      return;
    }
    setCreatingIssues(true);
    setIssueResults(null);
    try {
      const res = await fetch("http://localhost:5000/api/github/features/create-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.userId,
          repoName,
          openSource: !!isOpenSource,
          issues: toCreate.map(f => ({ title: f.title, body: f.description }))
        })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || JSON.stringify(payload));
      }
      setIssueResults(payload);
      // mark created ones as unselected / or remove
      const createdTitles = (payload.created || []).map(c => c.title);
      setFeatures(fs => fs.map(f => createdTitles.includes(f.title) ? { ...f, selected: false } : f));
      toast.success(`Created ${((payload.created || []).length || 0)} issues.`);
    } catch (err) {
      console.error("create issues error", err);
      toast.error("Failed to create issues: " + (err.message || err));
    } finally {
      setCreatingIssues(false);
    }
  }

    // Fetch README (if present). If missing, auto-generate a suggestion.
  async function fetchReadme() {
    setSuggestedReadme(""); // clear any previous suggestion when reloading repo
    if (!repoName) return;
    setReadmeLoading(true);
    setReadmeContent("");
    setReadmeExists(null);

    try {
      // Only attempt GET when we have a logged-in user (for Descope token)
      // but the server's /readme/get will work best when loginId present.
      const res = await fetch("http://localhost:5000/api/github/readme/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user?.userId, repoName })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        // treat as "no readme" but don't hard-fail UI
        console.warn("readme get failed", payload);
        setReadmeExists(false);
        setReadmeContent("");
        // auto-generate suggestion
        if (!suggestedReadme) await generateReadmeSuggestion();
        return;
      }

      if (payload.exists) {
        setReadmeExists(true);
        setReadmeContent(payload.content || "");
        // keep suggestedReadme cleared (only generate if user asks to regenerate)
      } else {
        setReadmeExists(false);
        setReadmeContent("");
        // auto-generate suggestion (only if not already generating / present)
        if (!suggestedReadme) await generateReadmeSuggestion();
      }
    } catch (e) {
      console.error("fetchReadme error", e);
      setReadmeExists(false);
      setReadmeContent("");
      if (!suggestedReadme) await generateReadmeSuggestion();
    } finally {
      setReadmeLoading(false);
    }
  }

  // Ask server to generate a README suggestion using Gemini
  async function generateReadmeSuggestion() {
    // Avoid duplicate concurrent generation
    if (suggestedLoading) return;
    setSuggestedLoading(true);
    setSuggestedReadme("");
    try {
      const res = await fetch("http://localhost:5000/api/github/readme/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user?.userId, repoName })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Server ${res.status}`);
      setSuggestedReadme(payload.suggested || "");
      toast.success("Generated README suggestion.");
    } catch (e) {
      setSuggestedReadme("Failed to generate README suggestion.");
      toast.error("Failed to generate README suggestion.");
    } finally {
      setSuggestedLoading(false);
    }
  }


  // Apply the suggested README (create/update on GitHub)
  async function applyReadme() {
    if (!user?.userId || !suggestedReadme) {
      toast.dark("Sign in and have a suggested README to apply.");
      return;
    }
    setApplyingReadme(true);
    try {
      const res = await fetch("http://localhost:5000/api/github/readme/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user.userId, repoName, content: suggestedReadme, commitMessage: "Add/update README via futurecommit" })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || JSON.stringify(payload));
      // success: refresh README from server
      await fetchReadme();
      // clear suggestion if you want
      setSuggestedReadme("");
      toast.success(`README applied${payload.html_url ? " — view: " + payload.html_url : ""}`);
    } catch (e) {
      console.error("applyReadme failed", e);
      toast.error("Failed to apply README: " + (e.message || e));
    } finally {
      setApplyingReadme(false);
    }
  }


  React.useEffect(() => {
    if (!details?.description && !descSuggestion && !descLoading) {
      fetchDescriptionSuggestion();
    }
    // eslint-disable-next-line
  }, [details?.description, repoName, user?.userId]);


      React.useEffect(() => {
    if (!details?.description && !descSuggestion && !descLoading) {
      fetchDescriptionSuggestion();
    }
    // fetch README whenever repo or user changes
    fetchReadme();
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
      toast.error("Failed to generate description.");
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
      toast.success("Repository description applied.");
    } catch (e) {
      console.error("applyDescription failed", e);
      toast.error("Failed to apply description.");
    } finally {
      setDescLoading(false);
    }
  }

  return (
    <>
    <ToastContainer position="top-right" autoClose={5000} theme="dark" />
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
        {details.languages?.length ? <div className="flex flex-wrap gap-2">{details.languages.map(l => <span key={l} className="px-3 py-1 rounded-full bg-indigo-700/80 text-white text-sm">{l}</span>)}</div> : <div className="text-gray-400">No language data.</div>}

        <h3 className="text-lg font-semibold mt-4 mb-2">Frameworks</h3>
        {details.frameworks?.length ? <div className="flex flex-wrap gap-2">{details.frameworks.map(f => <span key={f} className="px-3 py-1 rounded-full bg-pink-700/80 text-white text-sm">{f}</span>)}</div> : <div className="text-gray-400">No framework data.</div>}

        {/* --- Feature generation UI --- */}
        <div className="mb-8 mt-6">
          <h2 className="text-xl font-semibold mb-3">Generate Feature Ideas</h2>

          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isOpenSource}
                onChange={(e) => setIsOpenSource(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-800"
              />
              <span>Mark repository as Open Source (helps idea generation)</span>
            </label>

            <button
              onClick={handleGenerateFeatures}
              disabled={featuresLoading}
              className="ml-auto px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:brightness-105 disabled:opacity-50"
            >
              {featuresLoading ? "Generating..." : "Generate feature ideas"}
            </button>
          </div>

          {featuresLoading && <div className="text-sm text-gray-400">Analyzing repository and generating ideas...</div>}

          {features.length > 0 && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">{features.length} ideas</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFeatures(fs => fs.map(f => ({ ...f, selected: true })))}
                    className="px-3 py-1 rounded-md bg-gray-800 text-sm"
                  >Select all</button>
                  <button
                    onClick={() => setFeatures(fs => fs.map(f => ({ ...f, selected: false })))}
                    className="px-3 py-1 rounded-md bg-gray-800 text-sm"
                  >Unselect all</button>
                </div>
              </div>

              <div className="grid gap-3">
                {features.map(f => (
                  <div key={f.id} className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={f.selected} onChange={() => toggleFeatureSelected(f.id)} className="mt-1" />
                      <div>
                        <div className="font-semibold text-white">{f.title}</div>
                        <div className="text-sm text-gray-300 mt-1 whitespace-pre-line">{f.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCreateSelectedIssues}
                  disabled={creatingIssues}
                  className="px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold shadow disabled:opacity-50"
                >
                  {creatingIssues ? "Creating issues..." : "Create selected as GitHub issues"}
                </button>

                <button
                  onClick={() => {
                    // quick copy to clipboard of all suggestions
                    const txt = features.map(f => `- ${f.title}\n  ${f.description}`).join("\n\n");
                    navigator.clipboard.writeText(txt);
                    alert("Copied ideas to clipboard");
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-white font-semibold"
                >
                  Copy ideas
                </button>
              </div>

              {issueResults && (
                <div className="mt-3 text-sm text-gray-300">
                  Created {(issueResults.created || []).length} issues. {issueResults.failed ? `Failures: ${issueResults.failed.length}` : ""}
                </div>
              )}
            </div>
          )}
        </div>

                {/* README block */}
        <h2 className="text-xl font-semibold mb-3 mt-6">README</h2>
        <div className="mb-6">
          {readmeLoading ? (
            <div className="text-gray-400">Checking repository for README...</div>
          ) : readmeExists ? (
            <div className="bg-gray-800/60 p-4 rounded-xl border border-slate-700/40">
              <div className="text-sm text-gray-200 mb-3">README found in repository</div>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 max-h-64 overflow-auto p-2 bg-transparent rounded">{readmeContent}</pre>

              <div className="mt-3 flex gap-2">
                {/* Regenerate suggestion (creates a draft suggestion) */}
                <button
                  onClick={generateReadmeSuggestion}
                  disabled={suggestedLoading}
                  className="px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold shadow disabled:opacity-50"
                >
                  {suggestedLoading ? "Generating..." : "Regenerate (draft)"}
                </button>

                {/* copy */}
                <button
                  onClick={() => { navigator.clipboard.writeText(readmeContent); alert("Copied README to clipboard"); }}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-white font-semibold"
                >
                  Copy
                </button>
              </div>

              {/* If a suggestion exists while README existed, show suggestion area (allow apply) */}
              {suggestedReadme ? (
                <div className="mt-4 bg-gray-900/60 p-3 rounded-xl border border-pink-600/30">
                  <div className="text-sm text-gray-200 mb-2">Suggested README (preview)</div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-200 max-h-44 overflow-auto p-2 bg-transparent rounded">{suggestedReadme}</pre>
                  <div className="mt-3 flex gap-2">
                    <button onClick={applyReadme} disabled={applyingReadme} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">
                      {applyingReadme ? "Applying..." : "Apply"}
                    </button>
                    <button onClick={generateReadmeSuggestion} disabled={suggestedLoading || applyingReadme} className="px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold">
                      {suggestedLoading ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            // README missing -> auto-generated suggestion will be shown (no "Generate" button)
            <div className="mt-3 bg-gray-800/60 p-4 rounded-xl border border-pink-600/30">
              <div className="text-sm text-gray-200 mb-3">
                {suggestedLoading ? "Generating README suggestion..." : "No README present in repo — a draft has been generated."}
              </div>

              {suggestedReadme ? (
                <>
                  <pre className="whitespace-pre-wrap text-sm text-gray-200 max-h-64 overflow-auto p-2 bg-transparent rounded">{suggestedReadme}</pre>
                  <div className="mt-3 flex gap-2">
                    <button onClick={applyReadme} disabled={applyingReadme} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">
                      {applyingReadme ? "Applying..." : "Apply"}
                    </button>
                    <button onClick={generateReadmeSuggestion} disabled={suggestedLoading || applyingReadme} className="px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold">
                      {suggestedLoading ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>
                </>
              ) : (
                // In case generation failed or hasn't completed yet, show state
                <div className="text-gray-400">{suggestedLoading ? "Generating suggestion..." : "Suggestion not ready."}</div>
              )}
            </div>
          )}
        </div>

      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-24">
          <ConnectPanel layout="vertical" />
        </div>
      </aside>
    </motion.div>
    </>
  );
}
