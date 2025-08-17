import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID", "P31EeCcDPtwQGyi9wbZk4ZLKKE5a")
DESCOPE_MANAGEMENT_KEY = os.getenv("DESCOPE_MANAGEMENT_KEY", "K31Q3LIgVwny7Wdt5zt0cbxX8RXuESLJqoZRT3LLsVcFmwofUfhcSQOBY73l8HVp5rMjbMC")

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

    # Fetch organizations
    orgs_resp = requests.get("https://api.github.com/user/orgs", headers=headers)
    orgs = orgs_resp.json() if orgs_resp.status_code == 200 else []

    # Fetch gists
    gists_resp = requests.get("https://api.github.com/gists", headers=headers)
    gists = gists_resp.json() if gists_resp.status_code == 200 else []

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
        repo_info = {
            "name": repo["name"],
            "url": repo["html_url"],
            "description": repo.get("description"),
            "language": repo.get("language"),
            "stars": repo.get("stargazers_count"),
            "forks": repo.get("forks_count"),
            "open_issues": repo.get("open_issues_count"),
            "created_at": repo.get("created_at"),
            "updated_at": repo.get("updated_at"),
            "private": repo.get("private"),
            "topics": [],
            "license": repo.get("license", {}).get("name") if repo.get("license") else None,
            "contributors": [],
            "releases": [],
            "branches": [],
            "tags": [],
            "languages": {},
            "readme": "",
            "pull_requests": [],
            "issues": [],
        }
        # Topics
        topics_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/topics", headers={**headers, "Accept": "application/vnd.github.mercy-preview+json"})
        if topics_resp.status_code == 200:
            repo_info["topics"] = topics_resp.json().get("names", [])
        # Contributors
        contributors_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/contributors", headers=headers)
        if contributors_resp.status_code == 200:
            repo_info["contributors"] = contributors_resp.json()
        # Releases
        releases_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/releases", headers=headers)
        if releases_resp.status_code == 200:
            repo_info["releases"] = releases_resp.json()
        # Branches
        branches_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/branches", headers=headers)
        if branches_resp.status_code == 200:
            repo_info["branches"] = branches_resp.json()
        # Tags
        tags_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/tags", headers=headers)
        if tags_resp.status_code == 200:
            repo_info["tags"] = tags_resp.json()
        # Languages breakdown
        lang_resp = requests.get(repo["languages_url"], headers=headers)
        repo_info["languages"] = lang_resp.json() if lang_resp.status_code == 200 else {}
        # README
        readme_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/readme", headers=headers)
        if readme_resp.status_code == 200:
            readme_data = readme_resp.json()
            repo_info["readme"] = readme_data.get("content", "")
        # Pull Requests
        pr_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/pulls", headers=headers)
        if pr_resp.status_code == 200:
            repo_info["pull_requests"] = pr_resp.json()
        # Issues
        issues_resp = requests.get(f"https://api.github.com/repos/{repo['owner']['login']}/{repo['name']}/issues", headers=headers)
        if issues_resp.status_code == 200:
            repo_info["issues"] = issues_resp.json()
        repo_infos.append(repo_info)

    return jsonify({
        "profile": {
            "login": user_data.get("login"),
            "name": user_data.get("name"),
            "avatar_url": user_data.get("avatar_url"),
            "bio": user_data.get("bio"),
            "email": user_data.get("email"),
            "location": user_data.get("location"),
            "company": user_data.get("company"),
            "followers": user_data.get("followers"),
            "following": user_data.get("following"),
            "public_repos": user_data.get("public_repos"),
            "created_at": user_data.get("created_at"),
        },
        "organizations": orgs,
        "gists": gists,
        "repo_count": len(repo_infos),
        "repos": repo_infos
    })

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


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
