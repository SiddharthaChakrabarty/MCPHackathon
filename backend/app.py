import os
import requests
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
import json
from urllib.parse import quote_plus
from datetime import datetime
import pymongo

load_dotenv()
DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID", "P31EeCcDPtwQGyi9wbZk4ZLKKE5a")
DESCOPE_MANAGEMENT_KEY = os.getenv("DESCOPE_MANAGEMENT_KEY", "K31Q3LIgVwny7Wdt5zt0cbxX8RXuESLJqoZRT3LLsVcFmwofUfhcSQOBY73l8HVp5rMjbMC")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY","AIzaSyAVSGUozgbc7AQs4xEhP_-xaTGtN78HBFU")
YOUTUBE_OUTBOUND_APP_ID = os.getenv("YOUTUBE_OUTBOUND_APP_ID", "youtube")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "AIzaSyCh7j3Y14jGYKvJUEM0V-3i6HMDbv6jwIs")
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://csiddhartha2004:FMDfXQS5biMY0GiC@mcphackathon.ohkrsu9.mongodb.net/")  # Default to local MongoDB

# MongoDB connection
client = pymongo.MongoClient(MONGO_URI)
db = client["futurecommit"]
users_collection = db["users"]

genai.configure(api_key=GOOGLE_API_KEY)
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, supports_credentials=True)

def get_outbound_token(app_id: str, user_id: str):
    url = "https://api.descope.com/v1/mgmt/outbound/app/user/token/latest"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DESCOPE_PROJECT_ID}:{DESCOPE_MANAGEMENT_KEY}"
    }
    payload = {"appId": app_id, "userId": user_id, "options": {}}
    r = requests.post(url, headers=headers, json=payload)
    if r.status_code != 200:
        raise Exception(f"Failed to fetch token: {r.status_code} {r.text}")
    return r.json()["token"]

def detect_languages_from_code_blobs(blobs):
    tech_patterns = [
        ("React", ["import React", "from 'react'", "from \"react\"", ".jsx", ".tsx"]),
        ("Angular", ["@angular/core", "angular.module", "ng-controller", ".component.ts"]),
        ("Vue", ["<template>", "export default {", "from 'vue'", "from \"vue\""]),
        ("Ionic", ["@ionic/", "ionic-angular", "import { Ionic"]),
        ("Flutter", ["import 'package:flutter/", "void main() {", "Flutter"]),
        ("Docker", ["FROM ", "docker-compose", "CMD ", "ENTRYPOINT "]),
        ("Jenkins", ["pipeline {", "Jenkinsfile", "node {", "stage("]),
        ("TypeScript", [".ts", ".tsx"]),
        ("JavaScript", [".js", "function ", "const ", "let "]),
        ("Python", [".py", "def ", "import "]),
        ("Java", [".java", "public class ", "import java."]),
        ("Go", [".go", "package main", "func "]),
        ("Ruby", [".rb", "def ", "end"]),
        ("PHP", [".php", "<?php"]),
        ("C++", [".cpp", "#include", "std::"]),
        ("C#", [".cs", "namespace ", "using System"]),
        ("HTML", [".html", "<html", "<div"]),
        ("CSS", [".css", "{", "color:", "background:"]),
        ("Markdown", [".md", "# ", "## "]),
        ("Shell", [".sh", "#!/bin/bash", "echo "]),
        ("Other", [])
    ]
    tech_counts = {}
    for blob in blobs:
        path = blob["path"].lower()
        content = blob.get("content", "")
        found = False
        for tech, patterns in tech_patterns:
            for pattern in patterns:
                if pattern.startswith("."):
                    if path.endswith(pattern):
                        tech_counts[tech] = tech_counts.get(tech, 0) + len(content)
                        found = True
                        break
                else:
                    if pattern in content:
                        tech_counts[tech] = tech_counts.get(tech, 0) + len(content)
                        found = True
                        break
            if found:
                break
        if not found:
            tech_counts["Other"] = tech_counts.get("Other", 0) + len(content)
    # Remove zero-counts and return
    return {k: v for k, v in tech_counts.items() if v > 0}

@app.route("/api/user/register", methods=["POST"])
def user_register():
    body = request.get_json() or {}
    user_id = body.get("userId")
    email = body.get("email")
    name = body.get("name")
    if not user_id or not email:
        return jsonify({"error": "userId and email required"}), 400

    # Upsert user in MongoDB
    users_collection.update_one(
        {"userId": user_id},
        {
            "$set": {
                "email": email,
                "name": name,
                "updatedAt": datetime.utcnow()
            },
            "$setOnInsert": {
                "createdAt": datetime.utcnow()
            }
        },
        upsert=True
    )
    return jsonify({"success": True, "message": "User registered/updated successfully"})

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

    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return jsonify({"error": "github user request failed", "detail": user_resp.text}), 500
    user_login = user_resp.json().get("login")

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
            if repo.get("owner", {}).get("login") == user_login or repo.get("fork"):
                # Get last commit date
                commits_url = repo.get("commits_url", "").replace("{/sha}", "")
                last_commit = None
                if commits_url:
                    commits_resp = requests.get(commits_url, headers=headers, params={"per_page": 1})
                    if commits_resp.status_code == 200 and commits_resp.json():
                        last_commit = commits_resp.json()[0].get("commit", {}).get("author", {}).get("date")
                repos.append({
                    "name": repo.get("name"),
                    "url": repo.get("html_url"),
                    "private": repo.get("private"),
                    "last_commit": last_commit
                })
        page += 1

    return jsonify({"repos": repos})

@app.route("/api/github/repo/details", methods=["POST"])
def github_repo_details():
    import json
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

    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return jsonify({"error": "github user request failed", "detail": user_resp.text}), 500
    user_login = user_resp.json().get("login")

    repo_resp = requests.get(f"https://api.github.com/repos/{user_login}/{repo_name}", headers=headers)
    if repo_resp.status_code != 200:
        return jsonify({"error": "repo fetch failed", "detail": repo_resp.text}), 500
    repo = repo_resp.json()
    description = repo.get("description")
    repo_url = repo.get("html_url")

    # Gather code files for Gemini analysis
    tree_url = f"https://api.github.com/repos/{user_login}/{repo_name}/git/trees/main?recursive=1"
    tree_resp = requests.get(tree_url, headers=headers)
    tree = tree_resp.json().get("tree", []) if tree_resp.status_code == 200 else []
    code_contents = []
    for item in tree:
        if item["type"] == "blob" and (
            item["path"].endswith(".py") or item["path"].endswith(".js") or item["path"].endswith(".jsx") or item["path"].endswith(".ts") or item["path"].endswith(".tsx") or
            item["path"].endswith(".java") or item["path"].endswith(".go") or item["path"].endswith(".rb") or item["path"].endswith(".php") or item["path"].endswith(".c") or
            item["path"].endswith(".cpp") or item["path"].endswith(".cs") or item["path"].endswith(".html") or item["path"].endswith(".css") or item["path"].endswith(".md") or
            item["path"].endswith(".sh")
        ):
            file_url = f"https://api.github.com/repos/{user_login}/{repo_name}/contents/{item['path']}"
            file_resp = requests.get(file_url, headers=headers)
            if file_resp.status_code == 200:
                file_data = file_resp.json()
                try:
                    content = base64.b64decode(file_data.get("content", "")).decode("utf-8", errors="ignore")
                    code_contents.append(f"File: {item['path']}\n{content[:1500]}")
                except Exception:
                    continue
            if len(code_contents) >= 10:
                break

    # Use Gemini to get frameworks and languages
    prompt = f"""
    You are an expert software engineer. Given the following code files from a GitHub repository, analyze and list the main programming languages and frameworks used in this project. Return your answer as a JSON object with keys 'languages' and 'frameworks', each mapping to an array of strings. Only include the most relevant ones.

    {chr(10).join(code_contents)}

    JSON:
    """
    languages = []
    frameworks = []
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        print(f"Gemini response: {response.text.strip()}")
        # Extract JSON from Gemini response robustly
        response_text = response.text.strip()
        # Find the first '{' and last '}' to extract JSON block
        start = response_text.find('{')
        end = response_text.rfind('}')
        if start != -1 and end != -1:
            json_str = response_text[start:end+1]
            tech_info = json.loads(json_str)
            languages = tech_info.get("languages", [])
            frameworks = tech_info.get("frameworks", [])
    except Exception as e:
        print("Gemini extraction error:", e)
        languages = []
        frameworks = []

    # Get all commits (pagination)
    commits = []
    page = 1
    while True:
        commits_resp = requests.get(
            f"https://api.github.com/repos/{user_login}/{repo_name}/commits",
            headers=headers,
            params={"per_page": 100, "page": page}
        )
        if commits_resp.status_code != 200:
            break
        page_data = commits_resp.json()
        if not page_data:
            break
        for c in page_data:
            commit = c.get("commit", {})
            date = commit.get("author", {}).get("date")
            message = commit.get("message")
            commits.append({"date": date, "message": message})
        page += 1

    return jsonify({
        "name": repo_name,
        "url": repo_url,
        "description": description,
        "languages": languages,
        "frameworks": frameworks,
        "commits": commits
    })

def gemini_make_youtube_queries(languages, frameworks, repo_name=None, repo_description=None, top_k=6):
    prompt = f"""
    You are an expert learning curator and software engineering teacher. The user has a GitHub repository. The most important languages are: {languages}. The main frameworks are: {frameworks}. The repository name is: {repo_name or 'unknown'}. Repo description: {repo_description or 'none'}.


    Create a JSON object with two keys:
    - "queries": an array of {top_k} short YouTube search queries (each 3-6 words) that will find high-quality tutorial videos or short courses targeted to someone who knows the listed languages/frameworks but may have gaps. Prefer official crash-courses, long tutorial playlists, and migration/upgrading videos when relevant.
    - "playlist": an object with keys "title" and "description" — give a concise learning-playlist title and 1-2 sentence description.


    Return only valid JSON.
    """
    model = genai.GenerativeModel("gemini-2.0-flash")
    resp = model.generate_content(prompt)
    text = resp.text.strip()
    print(f"Gemini YouTube queries response: {text}")
    # robust JSON extraction
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        try:
            js = json.loads(text[start:end+1])
            return js.get('queries', []), js.get('playlist', {})
        except Exception:
            pass
    # fallback simple queries
    fallback_queries = []
    for lang in (languages or [])[:3]:
        fallback_queries.append(f"{lang} crash course")
    for fw in (frameworks or [])[:3]:
        fallback_queries.append(f"{fw} tutorial for beginners")
    return fallback_queries[:top_k], {"title": f"Learning path: {', '.join((frameworks or [])[:2] or (languages or [])[:2])}", "description": "Curated videos to fill gaps detected in your repository."}


# Helper: search YouTube (server API key)
def youtube_search(query, max_results=5):
    q = quote_plus(query)
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults={max_results}&q={q}&key={YOUTUBE_API_KEY}"
    r = requests.get(url)
    if r.status_code != 200:
        return []
    data = r.json()
    print(data)
    videos = []
    for it in data.get('items', []):
        vid = it['id'].get('videoId')
        snip = it['snippet']
        videos.append({
        'videoId': vid,
        'title': snip.get('title'),
        'description': snip.get('description'),
        'channelTitle': snip.get('channelTitle'),
        'thumbnail': snip.get('thumbnails', {}).get('default', {}).get('url'),
        'url': f"https://youtube.com/watch?v={vid}"
        })
    print(videos)
    return videos

@app.route('/api/youtube/suggestions', methods=['POST'])
def youtube_suggestions():
    body = request.get_json() or {}
    login_id = body.get('loginId')
    languages = body.get('languages') or body.get('languagesFromGemini') or []
    frameworks = body.get('frameworks') or body.get('frameworksFromGemini') or []
    repo_name = body.get('repoName')
    repo_description = body.get('description')


    try:
        queries, playlist_plan = gemini_make_youtube_queries(languages, frameworks, repo_name, repo_description)
    except Exception as e:
        queries, playlist_plan = [], {}


    # For each query, run a server-side YouTube search and dedupe results
    all_videos = []
    seen = set()
    for q in queries:
        vids = youtube_search(q, max_results=6)
        for v in vids:
            if v['videoId'] in seen:
                continue
            seen.add(v['videoId'])
            all_videos.append(v)
            if len(all_videos) >= 12:
                break


    # return top N videos and playlist plan
    return jsonify({
    'queries': queries,
    'playlist_plan': playlist_plan,
    'videos': all_videos[:12]
    })

@app.route('/api/youtube/create-playlist', methods=['POST'])
def youtube_create_playlist():
    body = request.get_json() or {}
    login_id = body.get('loginId')
    video_ids = body.get('videoIds') or []
    playlist_title = body.get('title') or 'Learning playlist'
    playlist_description = body.get('description') or ''


    if not login_id or not video_ids:
        return jsonify({'error': 'loginId and videoIds are required'}), 400


    # get user OAuth access token from Descope outbound app
    try:
        token = get_outbound_token(YOUTUBE_OUTBOUND_APP_ID, login_id)
        access_token = token.get('accessToken')
    except Exception as e:
        return jsonify({'error': 'failed to retrieve youtube token', 'detail': str(e)}), 500


    if not access_token:
        return jsonify({'error': 'no access token available for user, ask them to connect YouTube'}), 400


    # create playlist
    headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}
    create_url = 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status'
    body_payload = {
    'snippet': {'title': playlist_title, 'description': playlist_description},
    'status': {'privacyStatus': 'private'}
    }
    r = requests.post(create_url, headers=headers, json=body_payload)
    if r.status_code not in (200, 201):
        return jsonify({'error': 'failed to create playlist', 'detail': r.text}), 500
    playlist = r.json()
    playlist_id = playlist.get('id')


    # add videos to playlist
    added = []
    for vid in video_ids[:50]:
        add_url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet'
        item = {
            'snippet': {
            'playlistId': playlist_id,
            'resourceId': {'kind': 'youtube#video', 'videoId': vid}
            }
        }
        ar = requests.post(add_url, headers=headers, json=item)
        if ar.status_code in (200, 201):
            added.append(vid)


    playlist_url = f'https://www.youtube.com/playlist?list={playlist_id}'
    return jsonify({'playlistId': playlist_id, 'playlistUrl': playlist_url, 'added': added})

@app.route("/api/github/repo/collaborators", methods=["POST"])
def github_repo_collaborators():
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

    user_resp = requests.get("https://api.github.com/user", headers=headers)
    user_login = user_resp.json().get("login")

    collab_url = f"https://api.github.com/repos/{user_login}/{repo_name}/collaborators"
    collab_resp = requests.get(collab_url, headers=headers)
    if collab_resp.status_code != 200:
        return jsonify({"collaborators": []})
    return jsonify({"collaborators": collab_resp.json()})

@app.route("/api/github/description-apply", methods=["POST"])
def github_description_apply():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    description = body.get("description")
    if not login_id or not repo_name or not description:
        return jsonify({"error": "loginId, repoName, and description required"}), 400

    print(description)



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
    print("Working")
    # Get username
    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return jsonify({"error": "github user request failed", "detail": user_resp.text}), 500
    user_login = user_resp.json().get("login")

    # PATCH repo description
    print(user_login, repo_name, description)

    patch_url = f"https://api.github.com/repos/{user_login}/{repo_name}"
    patch_data = {"description": description}
    patch_resp = requests.patch(patch_url, headers=headers, json=patch_data)
    print(patch_resp.status_code, patch_resp.text)
    if patch_resp.status_code not in (200, 201):
        return jsonify({"error": "failed to update description", "detail": patch_resp.text}), 500



    return jsonify({"success": True, "description": description})

@app.route("/api/github/description-suggest", methods=["POST"])
def github_description_suggest():
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

    user_resp = requests.get("https://api.github.com/user", headers=headers)
    user_login = user_resp.json().get("login")

    # Gather code files for Gemini analysis
    tree_url = f"https://api.github.com/repos/{user_login}/{repo_name}/git/trees/main?recursive=1"
    tree_resp = requests.get(tree_url, headers=headers)
    tree = tree_resp.json().get("tree", []) if tree_resp.status_code == 200 else []
    code_contents = []
    for item in tree:
        if item["type"] == "blob" and (
            item["path"].endswith(".py") or item["path"].endswith(".js") or item["path"].endswith(".jsx") or item["path"].endswith(".ts") or item["path"].endswith(".tsx") or
            item["path"].endswith(".java") or item["path"].endswith(".go") or item["path"].endswith(".rb") or item["path"].endswith(".php") or item["path"].endswith(".c") or
            item["path"].endswith(".cpp") or item["path"].endswith(".cs") or item["path"].endswith(".html") or item["path"].endswith(".css") or item["path"].endswith(".md") or
            item["path"].endswith(".sh")
        ):
            file_url = f"https://api.github.com/repos/{user_login}/{repo_name}/contents/{item['path']}"
            file_resp = requests.get(file_url, headers=headers)
            if file_resp.status_code == 200:
                file_data = file_resp.json()
                try:
                    content = base64.b64decode(file_data.get("content", "")).decode("utf-8", errors="ignore")
                    code_contents.append(f"File: {item['path']}\n{content[:1500]}")
                except Exception:
                    continue
            if len(code_contents) >= 10:
                break

    prompt = f"""
You are an expert software engineer. Given the following code files from a GitHub repository, write a concise (1-2 sentence) description of what this repository does and its main purpose.It should not exceed 300 characters.

{chr(10).join(code_contents)}

Description:
"""
    suggested = ""
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        suggested = response.text.strip()
    except Exception as e:
        suggested = "No description available."

    return jsonify({"suggested": suggested})

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))