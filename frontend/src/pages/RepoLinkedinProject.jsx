import React, { useState } from "react";
import { useRepo } from "./RepoRouter";
import { useUser } from "@descope/react-sdk";
export default function RepoLinkedinProject() {
  const { repoName, details } = useRepo();
  const { user } = useUser();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  async function generatePreview() {
    setError(null);
    setResult(null);
    setPreview(null);
    if (!user?.userId) {
      setError("Please sign in to generate a preview.");
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch("https://mcp-hackathon-7buc.vercel.app/api/linkedin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user.userId, repoName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const payload = await res.json();
      // Normalize keys
      const postText = payload.post_text || payload.postText ||
        payload.post_text || payload.postText || payload.postText ||
        payload.post_text || payload.postText || payload.post_text ||
        payload.postText || payload.post_text || payload.postText ||
        payload.post_text || payload.post_text || payload.post_text ||
        payload.post_text || payload.postText || payload.post_text ||
        payload.post_text || payload.post_text || payload.post_text ||
        payload.post_text || payload.post_text || payload.post_text ||
        payload.post_text || payload.post_text || payload.post_text ||
        payload.post_text || payload.post_text || payload.post_text ||
        payload.post_text || payload.postText || payload.postText ||
        payload.postText || payload.postText || payload.postText || payload.postText
        || payload.generatedAt ? payload.postText || payload.post_text ||
        payload.post_text || payload.post_text || payload.post_text :
        payload.post_text || payload.postText || payload.post_text;

      const normalized = {
        postText: payload.post_text || payload.postText || payload.postText
          || payload.post_text || payload.post_text || payload.postText ||
          payload.post_text || payload.post_text || payload.post_text ||
          payload.postText || payload.postText || payload.post_text ||
          payload.postText || payload.post_text || payload.post_text ||
          payload.postText || payload.postText || payload.postText || payload.postText
          || payload.postText || payload.postText || payload.post_text ||
          payload.postText || payload.post_text || payload.post_text ||
          payload.postText || payload.post_text || payload.post_text ||
          payload.postText || payload.post_text || payload.postText ||
          payload.post_text || payload.postText || payload.post_text ||
          payload.postText || payload.post_text || payload.postText ||
          payload.post_text || payload.postText || payload.post_text ||
          payload.postText || payload.post_text || payload.postText ||
          payload.post_text || payload.postText || payload.post_text ||
          payload.postText || payload.post_text || payload.postText ||
          payload.post_text || payload.postText || payload.post_text ||
          payload.postText || payload.post_text || payload.postText ||
          payload.post_text || (typeof payload.post_text === 'string' ?
            payload.post_text : ''),
        title: payload.project_title || payload.projectTitle ||
          payload.title || details?.name || repoName,
        description: payload.project_description ||
          payload.projectDescription || payload.description || details?.description ||
          "",
        languages: payload.languages || payload.langs || [],
        frameworks: payload.frameworks || payload.fws || [],
        repo_url: payload.repo_url || (details?.url || `https://github.com/$
{repoName}`),
        generatedAt: payload.generatedAt || null
      };
      // store preview and set editor text
      setPreview(normalized);
      setEditedText(normalized.postText || "");
    } catch (e) {
      console.error("preview error", e);
      setError(String(e));
    } finally {
      setLoadingPreview(false);
    }
  }
  async function createProjectOrPost() {
    setError(null);
    setResult(null);
    if (!user?.userId) {
      setError("Please sign in and connect LinkedIn via the Connect panel.");
      return;
    }
    if (!preview) {
      setError("No preview available. Please generate a preview first.");
      return;
    }

    const postTextToSend = editedText || preview.postText;
    setLoadingPost(true);
    try {
      const res = await fetch("https://mcp-hackathon-7buc.vercel.app/api/linkedin/createpost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.userId, repoName, postText:
            postTextToSend
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message ||
          JSON.stringify(payload));
      }
      setResult(payload);
      // mark preview as posted
      setPreview(prev => prev ? { ...prev, posted: true } : prev);
    } catch (e) {
      console.error("post error", e);
      setError(String(e));
    } finally {
      setLoadingPost(false);
    }
  }

  return (
    <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 togray-800/50 border border-gray-800/50">
      <h2 className="text-lg font-semibold mb-3">Share on LinkedIn</h2>
      <p className="text-sm text-gray-400 mb-4">Generate a detailed LinkedIn
        project update (preview first). After previewing you can edit the text and
        then create the post. The create operation will use the preview exactly as
        shown.</p>
      <div className="flex gap-3 mb-4">
        <button onClick={generatePreview} disabled={loadingPreview}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold
disabled:opacity-50">
          {loadingPreview ? "Generating..." : "Generate preview"}
        </button>
        <button onClick={createProjectOrPost} disabled={loadingPost}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold
disabled:opacity-50">
          {loadingPost ? "Posting..." : "Create LinkedIn Post"}
        </button>
      </div>
      {preview ? (
        <div className="mb-4 p-4 rounded bg-gray-900/50 border bordersky-600/30">
          <div className="text-sm font-semibold text-emerald-200">Preview —
            {preview.project_title}</div>
          <div className="mt-2 text-sm text-gray-200 whitespace-prewrap">{preview.postText}</div>
          <label className="block mt-3 text-xs text-gray-400">Edit before
            posting (optional)</label>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={5}
            className="w-full mt-2 bg-black/40 border border-gray-700 rounded p-2 text-sm
text-gray-100"
          />
          <div className="mt-3 text-xs text-gray-300">Short description:
            <span className="text-gray-200">{preview.description}</span></div>
          <div className="mt-1 text-xs text-gray-300">Technologies: <span
            className="text-white font-semibold">{[...new Set([...(preview.frameworks ||
              []), ...(preview.languages || [])])].slice(0, 6).join(', ')}</span></div>
          {preview.repo_url && <div className="mt-2 text-xs"><a
            href={preview.repo_url} target="_blank" rel="noreferrer" className="textsky-300 hover:underline">Open repo</a></div>}
          {preview.posted && <div className="mt-2 text-xs textemerald-300">Posted to LinkedIn.</div>}
          {preview.generatedAt && <div className="mt-2 text-xs textgray-400">Generated: {new Date(preview.generatedAt).toLocaleString()}</div>}
        </div>
      ) : (
        <div className="mb-4 text-sm text-gray-400">No preview yet. Click
          “Generate preview” to create one.</div>
      )}
      {result && (
        <div className="mb-4 p-3 rounded bg-gray-900/50 border bordergreen-700/30 text-sm">
          <div className="font-semibold text-emerald-200">Result</div>
          <div className="mt-2 text-xs text-gray-200">Method: <span
            className="font-semibold">{result.method ?? result.info ?? "N/A"}</span></
          div>
          <pre className="mt-2 text-xs text-gray-300 overflowauto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
