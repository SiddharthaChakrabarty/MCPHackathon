import os
import json
import math
import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai


load_dotenv()

DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID", "P31EeCcDPtwQGyi9wbZk4ZLKKE5a")
DESCOPE_MANAGEMENT_KEY = os.getenv("DESCOPE_MANAGEMENT_KEY", "K31Q3LIgVwny7Wdt5zt0cbxX8RXuESLJqoZRT3LLsVcFmwofUfhcSQOBY73l8HVp5rMjbMC")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY","AIzaSyAVSGUozgbc7AQs4xEhP_-xaTGtN78HBFU")

if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is required in the environment (Google AI Studio API key).")

genai.configure(api_key=GOOGLE_API_KEY)
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, supports_credentials=True)

# -------------------------
# Helper: get outbound token
# -------------------------
def get_outbound_token(app_id: str, user_id: str, with_refresh=False, force_refresh=False):
    """
    Fetch the latest token without specifying scopes
    """
    url = "https://api.descope.com/v1/mgmt/outbound/app/user/token/latest"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DESCOPE_PROJECT_ID}:{DESCOPE_MANAGEMENT_KEY}"
    }
    payload = {
        "appId": app_id,
        "userId": user_id,
        "options": {
            "withRefreshToken": with_refresh,
            "forceRefresh": force_refresh
        }
    }
    r = requests.post(url, headers=headers, json=payload)
    if r.status_code != 200:
        raise Exception(f"Failed to fetch token: {r.status_code} {r.text}")
    return r.json()["token"]

# -------------------------
# Example: analyze GitHub repos
# -------------------------
@app.route("/api/github/analyze", methods=["POST"])
def github_analyze():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    if not login_id:
        return jsonify({"error": "loginId required"}), 400

    try:
        token = get_outbound_token("github", login_id)
        access_token = token["accessToken"]
    except Exception as e:
        return jsonify({"error": "failed to retrieve github token", "detail": str(e)}), 500

    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "descope-demo-app"
    }

    # Fetch user profile
    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return jsonify({"error": "github user request failed", "detail": user_resp.text}), 500
    user_data = user_resp.json()
    user_login = user_data.get("login")

    # Fetch repos
    repos = []
    page = 1
    while True:
        r = requests.get("https://api.github.com/user/repos", headers=headers, params={"per_page": 50, "page": page})
        if r.status_code != 200:
            return jsonify({"error": "github request failed", "detail": r.text}), 500
        page_data = r.json()
        if not page_data:
            break
        repos.extend(page_data)
        page += 1

    repo_infos = []
    for repo in repos:
        description = repo.get("description")
        repo_name = repo["name"]
        # If no description, generate one and update GitHub
        if not description:
            # Get up to 5 code/text files for context
            tree_url = f"https://api.github.com/repos/{user_login}/{repo_name}/git/trees/main?recursive=1"
            tree_resp = requests.get(tree_url, headers=headers)
            tree = tree_resp.json().get("tree", []) if tree_resp.status_code == 200 else []
            code_contents = []
            for item in tree:
                if item["type"] == "blob" and (
                    item["path"].endswith(".py") or item["path"].endswith(".js") or item["path"].endswith(".md") or item["path"].endswith(".txt")
                ):
                    file_url = f"https://api.github.com/repos/{user_login}/{repo_name}/contents/{item['path']}"
                    file_resp = requests.get(file_url, headers=headers)
                    if file_resp.status_code == 200:
                        file_data = file_resp.json()
                        import base64
                        try:
                            content = base64.b64decode(file_data.get("content", "")).decode("utf-8", errors="ignore")
                            code_contents.append(f"File: {item['path']}\n{content[:1500]}")
                        except Exception:
                            continue
                    if len(code_contents) >= 5:
                        break
            prompt = f"""
You are an expert software engineer. Given the following code files from a GitHub repository, write a concise (1-2 sentence) description of what this repository does and its main purpose.

{chr(10).join(code_contents)}

Description:
"""
            try:
                description = call_gemini_for_analysis(prompt).strip()
            except Exception:
                description = "No description available."
            # Update GitHub repo description
            patch_url = f"https://api.github.com/repos/{user_login}/{repo_name}"
            patch_resp = requests.patch(
                patch_url,
                headers={**headers, "Content-Type": "application/json"},
                json={"description": description}
            )
            # Ignore patch_resp status for now

        repo_infos.append({
            "name": repo_name,
            "url": repo["html_url"],
            "description": description
        })

    return jsonify({
        "profile": {
            "login": user_data.get("login"),
            "name": user_data.get("name"),
            "avatar_url": user_data.get("avatar_url"),
        },
        "repo_count": len(repo_infos),
        "repos": repo_infos
    })

# def fetch_github_data(login_id: str):
#     """
#     Return a dict with keys: profile, organizations, gists, repos (list).
#     This uses your outbound token fetching logic + GitHub API calls; adapted from your existing /api/github/analyze route.
#     """
#     token = get_outbound_token("github", login_id)
#     access_token = token["accessToken"]
#     headers = {
#         "Authorization": f"token {access_token}",
#         "Accept": "application/vnd.github+json",
#         "User-Agent": "descope-demo-app"
#     }

#     # user profile
#     user_resp = requests.get("https://api.github.com/user", headers=headers)
#     if user_resp.status_code != 200:
#         raise Exception(f"github user request failed: {user_resp.status_code} {user_resp.text}")
#     user_data = user_resp.json()

#     # orgs
#     orgs_resp = requests.get("https://api.github.com/user/orgs", headers=headers)
#     orgs = orgs_resp.json() if orgs_resp.status_code == 200 else []

#     # gists
#     gists_resp = requests.get("https://api.github.com/gists", headers=headers)
#     gists = gists_resp.json() if gists_resp.status_code == 200 else []

#     # repos (paginate)
#     repos = []
#     page = 1
#     while True:
#         r = requests.get("https://api.github.com/user/repos", headers=headers, params={"per_page": 50, "page": page})
#         if r.status_code != 200:
#             raise Exception(f"github repos request failed: {r.status_code} {r.text}")
#         page_data = r.json()
#         if not page_data:
#             break
#         # reduce to small shape for LLM consumption
#         for repo in page_data:
#             repo_summary = {
#                 "name": repo.get("name"),
#                 "description": repo.get("description"),
#                 "html_url": repo.get("html_url"),
#                 "language": repo.get("language"),
#                 "stars": repo.get("stargazers_count"),
#                 "forks": repo.get("forks_count"),
#                 "open_issues": repo.get("open_issues_count"),
#                 "created_at": repo.get("created_at"),
#                 "updated_at": repo.get("updated_at"),
#                 "private": repo.get("private"),
#                 "owner": repo.get("owner", {}).get("login")
#             }
#             # Languages breakdown
#             try:
#                 lang_resp = requests.get(repo.get("languages_url"), headers=headers)
#                 repo_summary["languages"] = lang_resp.json() if lang_resp.status_code == 200 : {}
#             except Exception:
#                 repo_summary["languages"] = {}
#             repos.append(repo_summary)
#         page += 1

#     return {
#         "profile": {
#             "login": user_data.get("login"),
#             "name": user_data.get("name"),
#             "avatar_url": user_data.get("avatar_url"),
#             "bio": user_data.get("bio"),
#             "email": user_data.get("email"),
#             "location": user_data.get("location"),
#             "company": user_data.get("company"),
#             "followers": user_data.get("followers"),
#             "following": user_data.get("following"),
#             "public_repos": user_data.get("public_repos"),
#             "created_at": user_data.get("created_at"),
#         },
#         "organizations": orgs,
#         "gists": gists,
#         "repos": repos
#     }

# -------------------------
# Example: Google Calendar create event
# -------------------------
@app.route("/api/calendar/create", methods=["POST"])
def create_calendar_event():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    summary = body.get("summary", "Coding session")
    start_iso = body.get("start_iso")
    end_iso = body.get("end_iso")
    if not (login_id and start_iso and end_iso):
        return jsonify({"error": "loginId, start_iso, end_iso required"}), 400

    try:
        token = get_outbound_token("google-calendar", login_id, scopes=["https://www.googleapis.com/auth/calendar"])
        access_token = token["accessToken"]
    except Exception as e:
        return jsonify({"error": "failed to retrieve google token", "detail": str(e)}), 500

    event_body = {
        "summary": summary,
        "start": {"dateTime": start_iso},
        "end": {"dateTime": end_iso},
        "conferenceData": {"createRequest": {"requestId": f"meet-{login_id}-{start_iso}"}}
    }

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
    r = requests.post(url, headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }, json=event_body)

    if r.status_code not in (200, 201):
        return jsonify({"error": "calendar create failed", "detail": r.text}), 500
    return jsonify(r.json())

# -------------------------
# Example: Slack post
# -------------------------
@app.route("/api/slack/post", methods=["POST"])
def slack_post():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    channel = body.get("channel", "#general")
    text = body.get("text", "Hello from app!")

    try:
        token = get_outbound_token("slack", login_id, scopes=["chat:write"])
        access_token = token["accessToken"]
    except Exception as e:
        return jsonify({"error": "failed to get slack token", "detail": str(e)}), 500

    r = requests.post("https://slack.com/api/chat.postMessage",
                      headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                      json={"channel": channel, "text": text})
    return jsonify(r.json())


def call_gemini_for_analysis(prompt: str):
    """
    Use the Google GenAI (Gemini) SDK to generate text response for the prompt.
    """
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    return response.text

# -------------------------
# New endpoint: analyze using Gemini
# -------------------------
@app.route("/api/github/analyze/ai", methods=["POST"])
def github_analyze_ai():
    """
    POST body: {"loginId": "<descope-login-id>", "options": {...}} 
    This endpoint fetches GitHub data (like /api/github/analyze), then runs LLM analysis and returns JSON.
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    options = body.get("options", {})
    if not login_id:
        return jsonify({"error": "loginId required"}), 400

    try:
        data = fetch_github_data(login_id)
    except Exception as e:
        return jsonify({"error": "failed to fetch github data", "detail": str(e)}), 500

    profile = data["profile"]
    repos = data["repos"]

    # Build a compact prompt: summarize account, top langs, and give per-repo action items.
    # To avoid token limits: summarize the top N repos by stars (or last updated).
    # Chunking approach: analyze top 8 repos in detail, others at summary level.

    # sort repos
    repos_sorted = sorted(repos, key=lambda r: (r.get("stars") or 0, r.get("updated_at") or ""), reverse=True)
    top_repos = repos_sorted[:8]
    other_repos = repos_sorted[8:]

    # prepare repo text blocks
    def repo_to_block(r):
        langs = ", ".join([f"{k}({v})" for k, v in (r.get("languages") or {}).items()][:5])
        return f"""Repo: {r.get('name')}
URL: {r.get('html_url')}
Desc: {r.get('description')}
Main language: {r.get('language')}
Languages breakdown: {langs}
Stars: {r.get('stars')}  Forks: {r.get('forks')}  Open issues: {r.get('open_issues')}
Private: {r.get('private')}  Updated: {r.get('updated_at')}
"""

    top_blocks = "\n\n".join([repo_to_block(r) for r in top_repos])
    other_summary = ", ".join([r["name"] for r in other_repos]) if other_repos else "None"

    # Compose a prompt that requests structured JSON output with specific fields.
    prompt = f"""
You are a senior engineering manager and code reviewer. Given the following GitHub account data, produce a structured JSON analysis.

Account:
- login: {profile.get('login')}
- name: {profile.get('name')}
- bio: {profile.get('bio')}
- email: {profile.get('email')}
- location: {profile.get('location')}
- company: {profile.get('company')}
- followers: {profile.get('followers')}
- public_repos: {profile.get('public_repos')}

Top repositories (detailed): 
{top_blocks}

Other repositories (names): {other_summary}

Return a JSON object with the following keys:
- account_summary: short paragraph (1-3 sentences) summarizing the account and top focus areas.
- top_languages: list of {{"language": "...", "approx_bytes": number}} for the overall account (estimate if exact not present).
- repo_analyses: list of objects, one per repo in the Top repositories with fields:
    - name
    - short_summary (1-2 sentences)
    - strengths (list of strings)
    - weaknesses (list of strings)
    - suggested_improvements (list of actionable items)
    - suggested_issue_or_pr_titles (list of short title strings)
    - suggested_example_PR_body (one markdown string example per repo)
    - estimated_effort (one of: tiny, small, medium, large, epic)
    - priority_score (0-100) where higher means fix/attention sooner

- global_recommendations: list of cross-repo recommendations (CI, dependency policy, security scans).
- security_flags: list of quick heuristics (files or patterns to inspect, e.g., credentials in history, large binary files, outdated dependencies).
- roadmap: prioritized list of next 5 steps across the account (one-line per step).
- notes: any other observations.

Be concise. Make all fields JSON-native (strings, lists, numbers). If you make guesses, mark them as estimates.
"""

    # Call Gemini
    try:
        llm_text = call_gemini_for_analysis(prompt)
        # The LLM should return JSON. Attempt to parse.
        analysis_json = None
        try:
            # some LLMs wrap JSON in backticks or markdown; try to extract JSON substring
            import re
            m = re.search(r"(\{(?:.|\n)*\})", llm_text)
            json_text = m.group(1) if m else llm_text
            analysis_json = json.loads(json_text)
        except Exception:
            # fallback: return raw text in 'raw' field
            analysis_json = {"raw": llm_text, "warning": "failed to parse LLM JSON; raw output provided"}
    except Exception as e:
        return jsonify({"error": "LLM request failed", "detail": str(e)}), 500

    # Attach a little metadata and return
    return jsonify({
        "profile": profile,
        "repo_count": len(repos),
        "analysis": analysis_json,
        "generated_at": time.time()
    })

@app.route("/api/github/repo/describe", methods=["POST"])
def github_repo_describe():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400

    try:
        token = get_outbound_token("github", login_id)
        access_token = token["accessToken"]
    except Exception as e:
        return jsonify({"error": "failed to retrieve github token", "detail": str(e)}), 500

    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "descope-demo-app"
    }

    # Get user login
    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return jsonify({"error": "github user request failed", "detail": user_resp.text}), 500
    user_login = user_resp.json().get("login")

    # Get repo tree (list of files)
    tree_url = f"https://api.github.com/repos/{user_login}/{repo_name}/git/trees/main?recursive=1"
    tree_resp = requests.get(tree_url, headers=headers)
    if tree_resp.status_code != 200:
        return jsonify({"error": "failed to fetch repo tree", "detail": tree_resp.text}), 500
    tree = tree_resp.json().get("tree", [])

    # Download up to 10 code/text files (skip binaries)
    code_contents = []
    for item in tree:
        if item["type"] == "blob" and (
            item["path"].endswith(".py") or item["path"].endswith(".js") or item["path"].endswith(".md") or item["path"].endswith(".txt")
        ):
            file_url = f"https://api.github.com/repos/{user_login}/{repo_name}/contents/{item['path']}"
            file_resp = requests.get(file_url, headers=headers)
            if file_resp.status_code == 200:
                file_data = file_resp.json()
                import base64
                try:
                    content = base64.b64decode(file_data.get("content", "")).decode("utf-8", errors="ignore")
                    code_contents.append(f"File: {item['path']}\n{content[:2000]}")
                except Exception:
                    continue
            if len(code_contents) >= 10:
                break

    prompt = f"""
You are an expert software engineer. Given the following code files from a GitHub repository, write a concise (1-2 sentence) description of what this repository does and its main purpose.

{chr(10).join(code_contents)}

Description:
"""
    try:
        description = call_gemini_for_analysis(prompt)
    except Exception as e:
        return jsonify({"error": "LLM request failed", "detail": str(e)}), 500

    return jsonify({"description": description.strip()})

@app.route("/api/github/minimal", methods=["POST"])
def github_minimal():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    if not login_id:
        return jsonify({"error": "loginId required"}), 400

    try:
        token = get_outbound_token("github", login_id)
        access_token = token["accessToken"]
    except Exception as e:
        return jsonify({"error": "failed to retrieve github token", "detail": str(e)}), 500

    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "descope-demo-app"
    }

    # Get user login
    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return jsonify({"error": "github user request failed", "detail": user_resp.text}), 500
    user_login = user_resp.json().get("login")

    # Fetch repos (owned or forked by user)
    repos = []
    page = 1
    while True:
        r = requests.get("https://api.github.com/user/repos", headers=headers, params={"per_page": 50, "page": page})
        if r.status_code != 200:
            return jsonify({"error": "github request failed", "detail": r.text}), 500
        page_data = r.json()
        if not page_data:
            break
        for repo in page_data:
            # Only include repos owned by user or forked by user
            if repo.get("owner", {}).get("login") == user_login or repo.get("fork"):
                repos.append({
                    "name": repo.get("name"),
                    "description": repo.get("description")
                })
        page += 1

    return jsonify({"repos": repos})

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
