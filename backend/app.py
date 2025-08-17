# backend/app.py
import os
import json
from flask import Flask, request, jsonify
import requests
from descope import DescopeClient
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

DESCOPE_PROJECT_ID = 'P31EeCcDPtwQGyi9wbZk4ZLKKE5a'
DESCOPE_MANAGEMENT_KEY = 'K31Q3LIgVwny7Wdt5zt0cbxX8RXuESLJqoZRT3LLsVcFmwofUfhcSQOBY73l8HVp5rMjbMC'  # management key
# Initialize Descope Python client (reads env if not passed)
descope_client = DescopeClient(
    project_id=DESCOPE_PROJECT_ID,
    management_key=DESCOPE_MANAGEMENT_KEY,
)

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, supports_credentials=True)

# -------------------------
# Helper: get provider token
# -------------------------
def get_provider_token(login_id: str, provider: str):
    """
    Uses Descope Management SDK to retrieve the stored provider token for loginId & provider.
    NOTE: method names may differ across SDK versions — the SDK docs show management APIs and
    an equivalent mgmt.user.get_provider_token exists. If your SDK version differs, call the
    management REST endpoint as documented.
    """
    try:
        # Use the SDK mgmt user API (this method exists in the SDK; if not - use the REST endpoint)
        token_info = descope_client.mgmt.user.get_provider_token(login_id=login_id, provider=provider)
        # returns object similar to { "provider": "google", "accessToken": "...", "expiration": ..., "scopes": [...] }
        return token_info
    except Exception as e:
        # fallback: attempt direct management REST call
        mgmt_token = f"{DESCOPE_PROJECT_ID}:{DESCOPE_MANAGEMENT_KEY}"
        url = f"https://api.descope.com/mgmt/v1/users/{login_id}/provider-token?provider={provider}"
        headers = {"Authorization": f"Bearer {mgmt_token}"}
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return r.json()
        raise

# -------------------------
# Simple route: analyze GitHub repos
# -------------------------
@app.route("/api/github/analyze", methods=["POST"])
def github_analyze():
    """
    Body: { loginId: "user@example.com" }
    Returns: repo list, top languages, topics and suggested youtube search queries
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    if not login_id:
        return jsonify({"error": "loginId required (user email)"}), 400

    # Get GitHub provider token stored in Descope for this user
    try:
        token_info = get_provider_token(login_id, "github")
    except Exception as e:
        return jsonify({"error": "failed to retrieve provider token", "detail": str(e)}), 500

    access_token = token_info.get("accessToken") or token_info.get("access_token") or token_info.get("accessToken")
    if not access_token:
        return jsonify({"error": "no access token found for github"}), 500

    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "descope-demo-app"
    }

    # Fetch user's repos
    repos = []
    page = 1
    while True:
        r = requests.get("https://api.github.com/user/repos", headers=headers, params={"per_page": 100, "page": page})
        if r.status_code != 200:
            return jsonify({"error": "github request failed", "detail": r.text}), 500
        page_data = r.json()
        if not page_data:
            break
        repos.extend(page_data)
        page += 1

    # Basic analysis: languages + topics
    lang_counts = {}
    topics = set()
    repo_summaries = []
    for repo in repos:
        name = repo.get("name")
        full_name = repo.get("full_name")
        # languages_url is available; fetch top language for each repo (optional)
        lang_r = requests.get(repo.get("languages_url"), headers=headers)
        repo_langs = lang_r.json() if lang_r.status_code == 200 else {}
        top_lang = None
        if repo_langs:
            # choose the language with highest bytes
            top_lang = max(repo_langs.items(), key=lambda kv: kv[1])[0]
            lang_counts[top_lang] = lang_counts.get(top_lang, 0) + 1
        # topics require repo topics endpoint; note GitHub topics require preview header
        topics_r = requests.get(f"https://api.github.com/repos/{full_name}/topics", headers={**headers, "Accept": "application/vnd.github.mercy-preview+json"})
        repo_topics = topics_r.json().get("names", []) if topics_r.status_code == 200 else []
        for t in repo_topics:
            topics.add(t)

        repo_summaries.append({
            "name": name,
            "full_name": full_name,
            "top_language": top_lang,
            "topics": repo_topics,
            "html_url": repo.get("html_url"),
            "description": repo.get("description")
        })

    # suggest youtube search queries: combine repo names, languages, and topics
    youtube_queries = []
    for r in repo_summaries[:6]:
        q = r["full_name"]
        if r["top_language"]:
            q += f" {r['top_language']} tutorial"
        youtube_queries.append(q)
    # general skill videos
    skill_suggestions = [
        "clean code best practices",
        "system design for beginners",
        "testing in python",
        "git workflow tutorials",
        "how to make a README that gets attention",
    ]

    result = {
        "repo_count": len(repos),
        "languages": sorted(lang_counts.items(), key=lambda x: -x[1]),
        "topics": list(topics)[:30],
        "repos": repo_summaries,
        "youtube_queries": youtube_queries,
        "skill_suggestions": skill_suggestions,
    }
    return jsonify(result)


# -------------------------
# YouTube search using Google provider token
# -------------------------
@app.route("/api/youtube/search", methods=["POST"])
def youtube_search():
    """
    Body: { loginId: "...", query: "react tutorial" }
    Returns: youtube search items using YouTube Data API v3 (requires youtube scopes enabled in Descope Google outbound app)
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    query = body.get("query")
    if not login_id or not query:
        return jsonify({"error": "loginId and query required"}), 400

    try:
        token_info = get_provider_token(login_id, "google")
    except Exception as e:
        return jsonify({"error": "failed to get google provider token", "detail": str(e)}), 500

    access_token = token_info.get("accessToken")
    if not access_token:
        return jsonify({"error": "no google access token"}), 500

    # Use the YouTube Data API; the token must have youtube scopes
    r = requests.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={"part": "snippet", "q": query, "type": "video", "maxResults": 8},
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if r.status_code != 200:
        return jsonify({"error": "youtube search failed", "detail": r.text}), 500
    return jsonify(r.json())


# -------------------------
# Create Google Calendar event (with Meet link)
# -------------------------
@app.route("/api/calendar/create", methods=["POST"])
def create_calendar_event():
    """
    Body: {
      loginId,
      summary,
      description,
      start_iso,  # e.g. 2025-08-18T09:00:00+05:30
      end_iso
    }
    Produces a calendar event in the user's primary calendar and requests conferenceData (Google Meet)
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    summary = body.get("summary", "Coding session")
    description = body.get("description", "")
    start_iso = body.get("start_iso")
    end_iso = body.get("end_iso")
    if not (login_id and start_iso and end_iso):
        return jsonify({"error": "loginId, start_iso and end_iso required"}), 400

    try:
        token_info = get_provider_token(login_id, "google")
    except Exception as e:
        return jsonify({"error": "failed to get google provider token", "detail": str(e)}), 500

    access_token = token_info.get("accessToken")
    if not access_token:
        return jsonify({"error": "no google access token"}), 500

    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_iso},
        "end": {"dateTime": end_iso},
        # request creation of Google Meet link
        "conferenceData": {"createRequest": {"requestId": f"meet-{login_id}-{start_iso}"}},
    }

    create_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
    r = requests.post(create_url, headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }, json=event_body)

    if r.status_code not in (200, 201):
        return jsonify({"error": "create event failed", "detail": r.text}), 500
    return jsonify(r.json())


# -------------------------
# LinkedIn post (example)
# -------------------------
@app.route("/api/linkedin/post", methods=["POST"])
def linkedin_post():
    """
    Body: { loginId, text }
    NOTE: you must create a LinkedIn Outbound App and request the 'w_member_social' and 'r_liteprofile' scopes.
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    text = body.get("text", "")
    if not (login_id and text):
        return jsonify({"error": "loginId and text required"}), 400

    try:
        token_info = get_provider_token(login_id, "linkedin")
    except Exception as e:
        return jsonify({"error": "failed to get linkedin provider token", "detail": str(e)}), 500

    access_token = token_info.get("accessToken")
    if not access_token:
        return jsonify({"error": "no linkedin access token"}), 500

    # Get user URN (fetch profile)
    profile_r = requests.get("https://api.linkedin.com/v2/me", headers={"Authorization": f"Bearer {access_token}"})
    if profile_r.status_code != 200:
        return jsonify({"error": "linkedin profile fetch failed", "detail": profile_r.text}), 500
    profile = profile_r.json()
    author_urn = f"urn:li:person:{profile.get('id')}"

    post_body = {
      "author": author_urn,
      "lifecycleState": "PUBLISHED",
      "specificContent": {
        "com.linkedin.ugc.ShareContent": {
          "shareCommentary": {"text": text},
          "shareMediaCategory": "NONE"
        }
      },
      "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
    }

    post_r = requests.post("https://api.linkedin.com/v2/ugcPosts", headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }, json=post_body)
    if post_r.status_code not in (200, 201):
        return jsonify({"error": "linkedin post failed", "detail": post_r.text}), 500
    return jsonify(post_r.json())


# -------------------------
# Notion create page (example)
# -------------------------
@app.route("/api/notion/createPage", methods=["POST"])
def notion_create_page():
    """
    Body: { loginId, title, content }
    Notion Outbound App must provide access to user's Notion pages with proper scopes.
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    title = body.get("title", "Project Note")
    content = body.get("content", "Auto note.")

    try:
        token_info = get_provider_token(login_id, "notion")
    except Exception as e:
        return jsonify({"error": "failed to get notion provider token", "detail": str(e)}), 500
    access_token = token_info.get("accessToken")
    if not access_token:
        return jsonify({"error": "no notion access token"}), 500

    # This is a simple example that creates a page under the user's workspace. In reality you need the parent (database id) or workspace.
    body_payload = {
      "parent": {"type": "page_id", "page_id": "replace-with-your-parent-page-id-or-database"},
      "properties": {
        "title": {
          "title": [{"text": {"content": title}}]
        }
      },
      "children": [
        {"object": "block", "type": "paragraph", "paragraph": {"text": [{"type":"text", "text":{"content": content}}]}}
      ]
    }
    r = requests.post("https://api.notion.com/v1/pages", headers={
        "Authorization": f"Bearer {access_token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }, json=body_payload)
    return jsonify({"status": r.status_code, "body": r.text})


# -------------------------
# Spotify create break playlist (example)
# -------------------------
@app.route("/api/spotify/create-playlist", methods=["POST"])
def spotify_create_playlist():
    """
    Body: { loginId, name }
    Spotify scopes: playlist-modify-private / playlist-modify-public
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    name = body.get("name", "Coding Breaks")

    try:
        token_info = get_provider_token(login_id, "spotify")
    except Exception as e:
        return jsonify({"error": "failed to get spotify provider token", "detail": str(e)}), 500
    access_token = token_info.get("accessToken")
    if not access_token:
        return jsonify({"error": "no spotify access token"}), 500

    # get user id
    me = requests.get("https://api.spotify.com/v1/me", headers={"Authorization": f"Bearer {access_token}"})
    if me.status_code != 200:
        return jsonify({"error": "spotify me failed", "detail": me.text}), 500
    user_id = me.json().get("id")

    playlist_r = requests.post(f"https://api.spotify.com/v1/users/{user_id}/playlists",
                               headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                               json={"name": name, "public": False, "description": "Short breaks playlist"})
    if playlist_r.status_code not in (200, 201):
        return jsonify({"error": "create playlist failed", "detail": playlist_r.text}), 500
    return jsonify(playlist_r.json())


# -------------------------
# Slack message example
# -------------------------
@app.route("/api/slack/post", methods=["POST"])
def slack_post():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    channel = body.get("channel", "#general")
    text = body.get("text", "Hello from app!")

    try:
        token_info = get_provider_token(login_id, "slack")
    except Exception as e:
        return jsonify({"error": "failed to get slack provider token", "detail": str(e)}), 500
    access_token = token_info.get("accessToken")

    r = requests.post("https://slack.com/api/chat.postMessage",
                      headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                      json={"channel": channel, "text": text})
    return jsonify(r.json())


# -------------------------
# Discord post via bot or user token (example)
# -------------------------
@app.route("/api/discord/post", methods=["POST"])
def discord_post():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    channel_id = body.get("channel_id")
    content = body.get("content", "Hello from the project app!")

    try:
        token_info = get_provider_token(login_id, "discord")
    except Exception as e:
        return jsonify({"error": "failed to get discord provider token", "detail": str(e)}), 500
    access_token = token_info.get("accessToken")

    # If you have a bot token, posting is done via bot header. With OAuth user tokens you can also post, but some endpoints differ.
    # Example: create message in channel
    r = requests.post(f"https://discord.com/api/v10/channels/{channel_id}/messages",
                      headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                      json={"content": content})
    return jsonify({"status": r.status_code, "body": r.text})


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
