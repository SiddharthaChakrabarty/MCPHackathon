// FILE: src/pages/RepoLinkedinProject.jsx
import React, { useState } from "react";
import { useRepo } from "./RepoRouter";
import { useUser } from "@descope/react-sdk";

/**
 * Frontend adjusted to work with the backend route:
 * POST /api/linkedin/create-project-update
 * - sends { loginId, repoName, preview?: true, postText?: string }
 * - backend might return generated preview fields (post_text, project_title, project_description, repo)
 * - or it might perform the UGC post and return { success: true, method: "ugc_post", postResponse: ... }
 *
 * This component:
 * - requests preview (preview:true) and expects backend to return generated text when available
 * - when posting, sends postText if the user edited the preview
 * - handles multiple response shapes gracefully
 */

export default function RepoLinkedinProject() {
  const { repoName, details } = useRepo();
  const { user } = useUser();

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [preview, setPreview] = useState(null); // { postText, title, description, repo }
  const [editedText, setEditedText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function normalizePreviewPayload(payload) {
    // Accept multiple possible key styles from backend (snake_case or camelCase)
    const postText =
      payload?.post_text ?? payload?.postText ?? payload?.postText ?? payload?.post_text ?? null;
    const title =
      payload?.project_title ?? payload?.projectTitle ?? payload?.title ?? null;
    const description =
      payload?.project_description ??
      payload?.projectDescription ??
      payload?.description ??
      null;
    const repo =
      payload?.repo ??
      (details && { name: details.name, url: details.url, description: details.description }) ??
      null;

    return {
      postText,
      title,
      description,
      repo
    };
  }

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
      const res = await fetch("http://localhost:5000/api/linkedin/create-project-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: user.userId, repoName, preview: true })
      });

      const payload = await res.json().catch(() => ({}));

      // If backend returned a generated preview object (common expected shape)
      const normalized = normalizePreviewPayload(payload);
      if (normalized.postText || normalized.title || normalized.description || normalized.repo) {
        const p = {
          postText: normalized.postText || `Project update: ${normalized?.repo?.name || repoName}`,
          title: normalized.title || normalized?.repo?.name || repoName,
          description: normalized.description || normalized?.repo?.description || "",
          repo: normalized.repo || (details && { name: details.name, url: details.url, description: details.description })
        };
        setPreview(p);
        setEditedText(p.postText || "");
        return;
      }

      // If backend performed the post (returned success + method) instead of preview
      if (payload?.success && payload?.method) {
        // Show result returned from backend (it likely contains LinkedIn response)
        setResult(payload);
        setPreview(prev => prev ? { ...prev, posted: true } : prev);
        // Give user a helpful message since this was supposed to be a preview step
        setError(
          "Backend returned a final post instead of a preview. See result for details."
        );
        return;
      }

      // If 404/500 or unexpected payload, surface error message if possible
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
      }

      // Fallback: use repo details if available
      const fallbackPreview = {
        postText: `Project update: ${details?.name || repoName}`,
        title: details?.name || repoName,
        description: details?.description || "",
        repo: details ? { name: details.name, url: details.url, description: details.description } : { name: repoName, url: `https://github.com/${repoName}`, description: "" }
      };
      setPreview(fallbackPreview);
      setEditedText(fallbackPreview.postText);

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

    setLoadingPost(true);
    try {
      const body = { loginId: user.userId, repoName };

      // If user edited the preview, forward the edited text to the backend.
      // The backend you shared currently doesn't read postText, but sending it is harmless
      // and future backend changes can consume it.
      if (editedText && editedText !== (preview?.postText || "")) {
        body.postText = editedText;
      }

      const res = await fetch("http://localhost:5000/api/linkedin/create-project-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        // backend might return useful error information
        throw new Error(payload?.error || payload?.message || JSON.stringify(payload));
      }

      // If backend returned a preview-like object (e.g., created/returned generated text)
      const normalized = normalizePreviewPayload(payload);
      if (normalized.postText || normalized.title || normalized.description || normalized.repo) {
        // Treat as "preview generated but not posted"
        const p = {
          postText: normalized.postText || `Project update: ${normalized?.repo?.name || repoName}`,
          title: normalized.title || normalized?.repo?.name || repoName,
          description: normalized.description || normalized?.repo?.description || "",
          repo: normalized.repo || (details && { name: details.name, url: details.url, description: details.description })
        };
        setPreview(p);
        setEditedText(p.postText || "");
        setResult({ info: "Preview generated (no post performed)", payload });
        return;
      }

      // If backend returned a final post result (expected for a real post)
      if (payload?.success && payload?.method) {
        setResult(payload);
        if (payload.method === "ugc_post" || payload.method === "profile_project") {
          setPreview(prev => prev ? { ...prev, posted: true } : prev);
        }
        return;
      }

      // Generic fallback - show whatever the backend returned
      setResult(payload);

    } catch (e) {
      console.error("post error", e);
      setError(String(e));
    } finally {
      setLoadingPost(false);
    }
  }

  return (
    <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800/50">
      <h2 className="text-lg font-semibold mb-3">Share on LinkedIn</h2>
      <p className="text-sm text-gray-400 mb-4">Generate a polished LinkedIn project update (or profile project) for this repository using Gemini. Preview first, then post.</p>

      <div className="flex gap-3 mb-4">
        <button onClick={generatePreview} disabled={loadingPreview} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50">
          {loadingPreview ? "Generating..." : "Generate preview"}
        </button>

        <button onClick={createProjectOrPost} disabled={loadingPost} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50">
          {loadingPost ? "Posting..." : "Create LinkedIn Project / Post"}
        </button>
      </div>

      {preview ? (
        <div className="mb-4 p-3 rounded bg-gray-900/50 border border-sky-600/30">
          <div className="text-sm font-semibold text-emerald-200">Preview</div>
          <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{preview.postText}</div>

          <label className="block mt-3 text-xs text-gray-400">Edit before posting (optional)</label>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={4}
            className="w-full mt-2 bg-black/40 border border-gray-700 rounded p-2 text-sm text-gray-100"
          />

          <div className="mt-3 text-xs text-gray-300">Title: <span className="text-white font-semibold">{preview.title}</span></div>
          <div className="mt-1 text-xs text-gray-300">Short description: <span className="text-gray-200">{preview.description}</span></div>
          {preview.repo?.url && <div className="mt-2 text-xs"><a href={preview.repo.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">Open repo</a></div>}
          {preview.posted && <div className="mt-2 text-xs text-emerald-300">Posted to LinkedIn.</div>}
        </div>
      ) : (
        <div className="mb-4 text-sm text-gray-400">No preview yet. Click “Generate preview” to create one.</div>
      )}

      {result && (
        <div className="mb-4 p-3 rounded bg-gray-900/50 border border-green-700/30 text-sm">
          <div className="font-semibold text-emerald-200">Result</div>
          <div className="mt-2 text-xs text-gray-200">Method: <span className="font-semibold">{result.method ?? result.info ?? "N/A"}</span></div>
          <pre className="mt-2 text-xs text-gray-300 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
