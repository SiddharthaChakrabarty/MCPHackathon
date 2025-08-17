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

    # Fetch repos
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

    return jsonify({
        "repo_count": len(repos),
        "repos": [{"name": r["name"], "url": r["html_url"]} for r in repos]
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
