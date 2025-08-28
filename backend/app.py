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
from datetime import datetime, timedelta
import time
import re

load_dotenv()
DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID", "P31EeCcDPtwQGyi9wbZk4ZLKKE5a")
DESCOPE_MANAGEMENT_KEY = os.getenv("DESCOPE_MANAGEMENT_KEY", "K31Q3LIgVwny7Wdt5zt0cbxX8RXuESLJqoZRT3LLsVcFmwofUfhcSQOBY73l8HVp5rMjbMC")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY","AIzaSyAVSGUozgbc7AQs4xEhP_-xaTGtN78HBFU")
YOUTUBE_OUTBOUND_APP_ID = os.getenv("YOUTUBE_OUTBOUND_APP_ID", "youtube")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "AIzaSyCgP1uNKltQwuGx3x7Db2GJS9lPk-QNJuE")
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://csiddhartha2004:FMDfXQS5biMY0GiC@mcphackathon.ohkrsu9.mongodb.net/")  # Default to local MongoDB
GOOGLE_CALENDAR_OUTBOUND_APP_ID = os.getenv("GOOGLE_CALENDAR_OUTBOUND_APP_ID", "google-calendar")  # change default if needed
LINKEDIN_OUTBOUND_APP_ID = os.getenv("LINKEDIN_OUTBOUND_APP_ID", "linkedin")
GOOGLE_SEARCH_CX = os.getenv("GOOGLE_SEARCH_CX", '40d822774ab9d4bf1')
GOOGLE_DRIVE_OUTBOUND_APP_ID = os.getenv("GOOGLE_DRIVE_OUTBOUND_APP_ID", "google-drive")
CUSTOM_SEARCH_API_KEY = os.getenv("CUSTOM_SEARCH_API_KEY", "AIzaSyA1p7XHFO-Y6ZmmvOuRTU4X6y5soG-zeEs")

# MongoDB connection
client = pymongo.MongoClient(MONGO_URI)
db = client["futurecommit"]
users_collection = db["users"]

genai.configure(api_key=GOOGLE_API_KEY)
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, supports_credentials=True)

def get_outbound_token(app_id: str, user_id: str):
    """
    Returns the token JSON from Descope mgmt API for the given outbound app and user.
    """
    url = "https://api.descope.com/v1/mgmt/outbound/app/user/token/latest"
    headers = {
        "Content-Type": "application/json",
        # management auth header format - adjust per your Descope setup
        "Authorization": f"Bearer {DESCOPE_PROJECT_ID}:{DESCOPE_MANAGEMENT_KEY}"
    }
    payload = {"appId": app_id, "userId": user_id, "options": {}}
    r = requests.post(url, headers=headers, json=payload)
    if r.status_code != 200:
        raise Exception(f"Failed to fetch token: {r.status_code} {r.text}")
    print(f"Descope token response: {r.json()}")
    return r.json()  # contains accessToken and other fields

def extract_access_token(token_json):
    """
    Robustly extract an OAuth access token from the Descope mgmt response.
    Supports shapes like:
      - {"token": {"accessToken": "..."}}
      - {"accessToken": "..."}
      - {"token": {"token": "..."}} (older)
      - {"tokenString": "..."}
      - {"token": {"access_token": "..."}}
    """
    if not token_json or not isinstance(token_json, dict):
        return None
    # direct fields
    for key in ("accessToken", "access_token", "tokenString", "token"):
        if key in token_json and isinstance(token_json[key], str):
            return token_json[key]
    # nested under 'token'
    token_field = token_json.get("token") or token_json.get("Token")
    if isinstance(token_field, dict):
        for k in ("accessToken", "access_token", "token", "tokenString"):
            if token_field.get(k):
                return token_field.get(k)

def fetch_github_user_and_collaborators(access_token, repo_name):
    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "descope-demo-app"
    }
    # get authenticated user (owner) login
    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        raise Exception(f"GitHub user request failed: {user_resp.status_code} {user_resp.text}")
    user_login = user_resp.json().get("login")

    collab_url = f"https://api.github.com/repos/{user_login}/{repo_name}/collaborators?per_page=100"
    collab_resp = requests.get(collab_url, headers=headers)
    if collab_resp.status_code != 200:
        # Try reading collaborator listing failed; return empty list
        return user_login, []
    return user_login, collab_resp.json()

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
        access_token = token['token']["accessToken"]
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
        access_token = token['token']["accessToken"]
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
        access_token = token['token']["accessToken"]
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
    print(body)
    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400
    
    print(1)

    try:
        token = get_outbound_token("github", login_id)
        access_token = token['token']["accessToken"]
    except Exception as e:
        return jsonify({"error": "failed to retrieve github token", "detail": str(e)}), 500
    
    print(2)

    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "descope-demo-app"
    }
    
    print(3)

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

    try:
        token = get_outbound_token("github", login_id)
        access_token = token['token']["accessToken"]
    except Exception as e:
        return jsonify({"error": "failed to retrieve github token", "detail": str(e)}), 500

    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "descope-demo-app"
    }
    # Get username
    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return jsonify({"error": "github user request failed", "detail": user_resp.text}), 500
    user_login = user_resp.json().get("login")


    patch_url = f"https://api.github.com/repos/{user_login}/{repo_name}"
    patch_data = {"description": description}
    patch_resp = requests.patch(patch_url, headers=headers, json=patch_data)
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
        access_token = token['token']["accessToken"]
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

def generate_linkedin_text_from_repo(repo_details):
    """
    Use Gemini to create a polished LinkedIn project update and a concise project description for Profile API.
    Returns: { 'post_text': str, 'project_title': str, 'project_description': str }
    """
    # Build a prompt using repo info
    name = repo_details.get("name") or ""
    description = repo_details.get("description") or ""
    langs = ", ".join(repo_details.get("languages") or []) or "N/A"
    fws = ", ".join(repo_details.get("frameworks") or []) or "N/A"
    commits = repo_details.get("commits") or []
    last_commit = commits[0].get("date") if commits else None

    prompt = f"""
You are an experienced technical writer and social media editor skilled at writing professional LinkedIn updates.
Given the repository details below, create:

1) A LinkedIn *project update* (a professional post) 2-4 sentences (max 400 characters) that announces the project, summarizes key languages/frameworks, and suggests impact/next steps. Use an upbeat professional tone, include 1-2 relevant hashtags (e.g. #React #OpenSource) and a short CTA like "See repo: <repo_url>".

2) A concise project title (max 60 characters).

3) A 1-2 sentence project description suitable for the LinkedIn Projects API (max 300 characters).

Return a JSON object with keys: post_text, project_title, project_description only.
Repository:
name: {name}
description: {description}
languages: {langs}
frameworks: {fws}
repo_url: {repo_details.get("url") or '' }
last_commit: {last_commit}
"""
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt)
        out_text = resp.text.strip()
        # extract first JSON block
        start = out_text.find('{')
        end = out_text.rfind('}')
        if start != -1 and end != -1:
            payload = json.loads(out_text[start:end+1])
            return {
                "post_text": payload.get("post_text", "").strip(),
                "project_title": payload.get("project_title", "").strip(),
                "project_description": payload.get("project_description", "").strip()
            }
    except Exception as e:
        print("Gemini generative error:", e)

    # Fallback simple generation
    post_text = f"{name} — {description or 'A new project.'} Languages: {langs}. Frameworks: {fws}. See repo: {repo_details.get('url') or ''}"
    title = name[:60]
    pdesc = (description or post_text)[:300]
    return {"post_text": post_text, "project_title": title, "project_description": pdesc}

def create_linkedin_profile_project(access_token, person_id, title, description, url=None, members=None, single_date=True):
    """
    Calls LinkedIn Profile Edit API to create a project:
    POST https://api.linkedin.com/v2/people/id={person ID}/projects
    Returns (status_code, response_json_or_text, headers)
    """
    api_url = f"https://api.linkedin.com/v2/people/id={person_id}/projects"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }

    # Build localized fields structure LinkedIn expects
    localized_title = {
        "preferredLocale": {"country": "US", "language": "en"},
        "localized": {"en_US": title}
    }
    localized_description = {
        "preferredLocale": {"country": "US", "language": "en"},
        "localized": {"en_US": description}
    }
    payload = {
        "singleDate": single_date,
        "title": localized_title,
        "description": localized_description
    }
    if url:
        payload["url"] = url
    if members:
        # members should be list of {"memberId": "urn:li:person:...", "name": {...localized...}}; simple fallback:
        payload["members"] = members

    r = requests.post(api_url, headers=headers, json=payload, timeout=20)
    try:
        return r.status_code, r.json(), r.headers
    except Exception:
        return r.status_code, r.text, r.headers

def create_linkedin_ugc_post(access_token, author_urn, post_text, repo_url=None, repo_title=None, visibility="PUBLIC"):
    """
    Create a UGC post on behalf of the member (fallback).
    Uses v2 ugcPosts endpoint.
    Returns (status_code, response_json_or_text).
    Docs: https://learn.microsoft.com/en-us/linkedin/compliance/integrations/shares/ugc-post-api
    """
    api_url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }

    media_section = []
    if repo_url:
        # Add as an "article" style media item referencing repo_url (LinkedIn will display link preview)
        media_section = [{
            "status": "READY",
            "description": {"text": f"{repo_title or ''}"},
            "originalUrl": repo_url,
            "title": {"text": repo_title or repo_url}
        }]

    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": post_text},
                "shareMediaCategory": "ARTICLE" if media_section else "NONE",
                "media": media_section
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": visibility}
    }

    r = requests.post(api_url, headers=headers, json=payload, timeout=20)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.text

def create_linkedin_ugc_post(access_token: str, author_urn: str, text: str, repo_url: str = None, repo_title: str = None):
    """
    Creates a LinkedIn UGC post (v2/ugcPosts).
    - access_token: OAuth2 access token (w_member_social required)
    - author_urn: "urn:li:person:{id}"
    - text: the post text
    - repo_url: optional article URL to attach (will create shareMediaCategory: ARTICLE)
    - repo_title: optional title to attach to the article media
    Returns: (status_code, parsed_response_or_text)
    """
    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json"
    }

    # Build the ShareContent structure
    share_content = {
        "shareCommentary": {"text": text},
        # default to NONE for text-only posts
        "shareMediaCategory": "NONE"
    }

    if repo_url:
        # Convert to an ARTICLE share with a single media item
        share_content["shareMediaCategory"] = "ARTICLE"
        media_item = {
            "status": "READY",
            "originalUrl": repo_url,
            "description": {"text": project_description_from_text(text=repo_title or "", repo_url=repo_url)},
            "title": {"text": repo_title or repo_url}
        }
        share_content["media"] = [media_item]

    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": share_content
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }

    # Do the POST
    resp = requests.post(url, headers=headers, json=payload, timeout=15)
    try:
        parsed = resp.json()
    except ValueError:
        parsed = resp.text
    return resp.status_code, parsed

def project_description_from_text(text: str, repo_url: str) -> str:
    """Small helper to form a reasonable description for the media item."""
    if text:
        return text
    if repo_url:
        return f"Check out the project: {repo_url}"
    return ""

# --- Your route, simplified to only UGC posting ---
@app.route("/api/linkedin/create-project-update", methods=["POST"])
def linkedin_create_project_update():
    """
    Flow (UGC-only):
      - Get Descope outbound token for LinkedIn
      - Get LinkedIn member id (userinfo via OIDC) -> construct author urn
      - Fetch GitHub repo details (reuse existing local endpoint)
      - Use Gemini to create text/title/description
      - Create UGC post (article if repo_url provided, otherwise text-only)
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")

    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400

    # 1) get LinkedIn outbound token from Descope
    try:
        token_json = get_outbound_token(LINKEDIN_OUTBOUND_APP_ID, login_id)
        linkedin_access_token = extract_access_token(token_json)
        if not linkedin_access_token:
            return jsonify({"error": "no linkedin access token from Descope", "detail": token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed to retrieve linkedin token", "detail": str(e)}), 500

    # 2) get member id (URN) via OIDC userinfo
    try:
        userinfo_resp = requests.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {linkedin_access_token}"},
            timeout=10
        )
        print("LinkedIn /userinfo response:", userinfo_resp.status_code, userinfo_resp.text)
        if userinfo_resp.status_code != 200:
            return jsonify({
                "error": "failed to fetch linkedin userinfo",
                "status": userinfo_resp.status_code,
                "detail": userinfo_resp.text
            }), 500

        userinfo = userinfo_resp.json()
        member_id = userinfo.get("sub")
        if not member_id:
            return jsonify({"error": "no sub in userinfo", "detail": userinfo}), 500
        author_urn = f"urn:li:person:{member_id}"
    except Exception as e:
        return jsonify({"error": "linkedin /userinfo failed", "detail": str(e)}), 500

    # 3) fetch repo details (local helper endpoint)
    try:
        local_resp = requests.post(
            "http://localhost:5000/api/github/repo/details",
            json={"loginId": login_id, "repoName": repo_name},
            timeout=30
        )
        if local_resp.status_code != 200:
            repo_details = {"name": repo_name, "url": f"https://github.com/{repo_name}", "description": ""}
        else:
            repo_details = local_resp.json()
    except Exception as e:
        repo_details = {"name": repo_name, "url": f"https://github.com/{repo_name}", "description": ""}

    # 4) generate LinkedIn text via Gemini
    gen = generate_linkedin_text_from_repo(repo_details)
    post_text = gen.get("post_text") or f"Project update: {repo_details.get('name')}"
    project_title = gen.get("project_title") or repo_details.get("name")
    project_description = gen.get("project_description") or (repo_details.get("description") or "")

    # 5) Create UGC post (only path)
    try:
        status_code, resp_json = create_linkedin_ugc_post(
            linkedin_access_token,
            author_urn,
            post_text,
            repo_url=repo_details.get("url"),
            repo_title=project_title
        )
        if status_code in (200, 201):
            return jsonify({
                "success": True,
                "method": "ugc_post",
                "postResponse": resp_json
            }), 201
        else:
            # include LinkedIn response so client can show exact failure reason
            return jsonify({
                "error": "linkedin_post_failed",
                "status": status_code,
                "response": resp_json
            }), 500
    except Exception as e:
        return jsonify({"error": "linkedin_fallback_failed", "detail": str(e)}), 500


@app.route("/api/outbound/link-provider", methods=["POST"])
def outbound_link_provider():
    """
    Accepts JSON: { providerId, descopeUserId, email }
    - Uses Descope mgmt token to get the outbound access token for the provider+user,
    - Calls the provider API (GitHub) to fetch profile (id & login),
    - Updates users_collection entry for the matching userId/email to include connectedAccounts.github = {...}
    """
    body = request.get_json() or {}
    provider_id = body.get("providerId")
    descope_user_id = body.get("descopeUserId")
    email = body.get("email")
    app_user_id = body.get("appUserId")  # optional - may pass Descope user id used in your DB

    if not provider_id:
        return jsonify({"error": "providerId required"}), 400
    if not (descope_user_id or email or app_user_id):
        return jsonify({"error": "descopeUserId or email or appUserId required"}), 400

    # Only GitHub implemented here; add other providers as needed
    if provider_id != "github":
        return jsonify({"error": "only github provider supported in this endpoint (demo)"}), 400

    # fetch outbound token from Descope
    try:
        token_json = get_outbound_token(provider_id, descope_user_id or app_user_id)
        access_token = token_json['token']["accessToken"]
        if not access_token:
            return jsonify({"error": "no access token returned from Descope", "detail": token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed to retrieve outbound token", "detail": str(e)}), 500

    # fetch GitHub profile
    try:
        headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "descope-demo-app"
        }
        r = requests.get("https://api.github.com/user", headers=headers)
        if r.status_code != 200:
            return jsonify({"error": "github user request failed", "detail": r.text}), 500
        gh = r.json()
        gh_id = gh.get("id")
        gh_login = gh.get("login")
    except Exception as e:
        return jsonify({"error": "failed to fetch github profile", "detail": str(e)}), 500

    # store mapping in users_collection; prefer app_user_id -> userId if present, otherwise email
    filter_query = {}
    if app_user_id:
        filter_query = {"userId": app_user_id}
    elif email:
        filter_query = {"email": email}
    elif descope_user_id:
        # you may have stored userId = descope_user_id previously; try both fields
        filter_query = {"userId": descope_user_id}

    if not filter_query:
        return jsonify({"error": "no user identifier provided to link account"}), 400

    update = {
        "$set": {
            "connectedAccounts.github": {
                "id": gh_id,
                "login": gh_login,
                "linkedAt": datetime.utcnow()
            },
            "updatedAt": datetime.utcnow()
        }
    }

    result = users_collection.update_one(filter_query, update)
    if result.matched_count == 0:
        # optionally upsert: attach GitHub info under email or userId
        # Here we'll try upsert by email (if email provided)
        if email:
            users_collection.update_one({"email": email}, {"$set": {
                "connectedAccounts.github": {
                    "id": gh_id,
                    "login": gh_login,
                    "linkedAt": datetime.utcnow()
                },
                "updatedAt": datetime.utcnow()
            }}, upsert=True)
            linked_to = "email (upsert)"
        else:
            # fallback: create new doc keyed by userId if we have descope_user_id/app_user_id
            users_collection.update_one({"userId": descope_user_id or app_user_id}, {"$set": {
                "connectedAccounts.github": {
                    "id": gh_id,
                    "login": gh_login,
                    "linkedAt": datetime.utcnow()
                },
                "updatedAt": datetime.utcnow(),
                "createdAt": datetime.utcnow()
            }}, upsert=True)
            linked_to = "userId (upsert)"
    else:
        linked_to = "existing user document"

    return jsonify({
        "success": True,
        "provider": "github",
        "github": {"id": gh_id, "login": gh_login},
        "linkedTo": linked_to
    })

@app.route("/api/meet/create-and-invite", methods=["POST"])
def meet_create_and_invite():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    custom_title = body.get("title")

    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400

    # 1) get GitHub token so we can list collaborators
    try:
        gh_token_json = get_outbound_token("github", login_id)
        gh_access_token = extract_access_token(gh_token_json)
        if not gh_access_token:
            return jsonify({"error": "no github access token from Descope", "detail": gh_token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed to retrieve github token", "detail": str(e)}), 500

    # 2) fetch collaborators using helper (must return owner and list)
    try:
        owner_login, collaborators = fetch_github_user_and_collaborators(gh_access_token, repo_name)
        collab_logins = [c.get("login") for c in collaborators if c.get("login")]
    except Exception as e:
        return jsonify({"error": "failed to list collaborators", "detail": str(e)}), 500

    # 3) find collaborator emails from DB
    emails = []
    if collab_logins:
        try:
            docs = users_collection.find({"connectedAccounts.github.login": {"$in": collab_logins}})
            for d in docs:
                em = d.get("email")
                if em:
                    emails.append(em)
        except Exception as e:
            print("DB lookup error mapping collaborators to emails:", str(e))

    emails = list(dict.fromkeys(emails))

    # 4) get Google Calendar token from the right outbound app id
    try:
        google_app_id = GOOGLE_CALENDAR_OUTBOUND_APP_ID
        google_token_json = get_outbound_token(google_app_id, login_id)
        google_access_token = extract_access_token(google_token_json)
        if not google_access_token:
            return jsonify({"error": "no google calendar access token from Descope", "detail": google_token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed to retrieve google calendar token", "detail": str(e)}), 500

    # 5) create calendar event (try conferenceData; fallback to plain event)
    try:
        now = datetime.utcnow()
        start_dt = now + timedelta(minutes=2)
        end_dt = start_dt + timedelta(minutes=45)
        start_iso = start_dt.replace(microsecond=0).isoformat() + "Z"
        end_iso = end_dt.replace(microsecond=0).isoformat() + "Z"

        summary = custom_title or f"{repo_name} — FutureCommit Meeting"
        request_id = f"fc-meet-{login_id}-{int(time.time())}"

        event_payload = {
            "summary": summary,
            "description": f"Auto-generated meeting for repo {repo_name}",
            "start": {"dateTime": start_iso, "timeZone": "UTC"},
            "end": {"dateTime": end_iso, "timeZone": "UTC"},
            "attendees": [{"email": e} for e in emails],
            "conferenceData": {
                "createRequest": {
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                    "requestId": request_id
                }
            }
        }

        create_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all"
        headers = {
            "Authorization": f"Bearer {google_access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        r = requests.post(create_url, headers=headers, json=event_payload, timeout=20)

        if r.status_code not in (200, 201):
            # return Google's full error body so client can display useful info
            google_error_body = r.text
            # Detect insufficient scope and advise re-consent
            try:
                ge = r.json()
                reason = ge.get("error", {}).get("details", [{}])[0].get("reason", "")
                if ge.get("error", {}).get("status") == "PERMISSION_DENIED" or "insufficientPermissions" in google_error_body:
                    return jsonify({
                        "error": "google_insufficient_scope",
                        "message": "Google returned insufficient scopes for the token. The user must re-consent to the Google Calendar outbound app with calendar scopes.",
                        "google_response": ge
                    }), 403
            except Exception:
                pass

            # try fallback: event without conferenceData
            fallback_payload = {k: v for k, v in event_payload.items() if k != "conferenceData"}
            r2 = requests.post("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", headers=headers, json=fallback_payload, timeout=20)
            if r2.status_code in (200, 201):
                ev = r2.json()
                return jsonify({
                    "success": True,
                    "meetLink": None,
                    "eventId": ev.get("id"),
                    "invited": emails,
                    "warning": "conference creation failed but event was created.", "google_response": r.text
                }), 200
            else:
                return jsonify({"error": "google_api_error", "google_response": r.text, "status_code": r.status_code}), 500

        event = r.json()
        meet_link = event.get("hangoutLink")
        if not meet_link:
            cd = event.get("conferenceData", {})
            entry_points = cd.get("entryPoints", []) if isinstance(cd, dict) else []
            for ep in entry_points:
                if ep.get("entryPointType") in ("video",) or ep.get("type") in ("video",):
                    meet_link = ep.get("uri") or ep.get("address")
                    break
        event_id = event.get("id")

    except Exception as e:
        print("EXCEPTION during meet creation:", str(e))
        return jsonify({"error": "failed_to_create_meet", "detail": str(e)}), 500

    return jsonify({
        "success": True,
        "meetLink": meet_link,
        "eventId": event_id,
        "invited": emails
    })

def fetch_local_repo_details(login_id, repo_name):
    try:
        local_resp = requests.post(
        "http://localhost:5000/api/github/repo/details",
        json={"loginId": login_id, "repoName": repo_name},
        timeout=30,
        )
        if local_resp.status_code == 200:
            return local_resp.json()
    except Exception:
        pass
    return {"name": repo_name, "url": f"https://github.com/{repo_name}",
    "description": ""}

# New: strong LinkedIn-style preview generator (detailed)
def generate_linkedin_preview(repo_details, top_hashtags=None):
    name = repo_details.get("name") or "Project"
    description = repo_details.get("description") or ""
    languages = repo_details.get("languages") or []
    frameworks = repo_details.get("frameworks") or []
    repo_url = repo_details.get("url") or f"https://github.com/{name}"
    hashtags = top_hashtags or ([(frameworks[0] if frameworks else
    (languages[0] if languages else "Project"))] if frameworks or languages else
    [])
    hashtag_str = " ".join([f"#{h.replace(' ', '')}" for h in hashtags[:2]])
    prompt = f"""
    You are an expert technical writer and social media editor specialized in
    LinkedIn posts for software projects.
    Given the repository details below, write a **detailed LinkedIn-style project
    update** intended for an engineering audience and potential collaborators/
    hiring managers.
    Requirements:
    - 3-4 concise sentences (but detailed) describing the problem the project
    addresses, the approach/architecture, the key technologies (list 2–4), and
    the impact or next steps.
    - Include 1-2 short, relevant hashtags at the end and a clear call-to-action
    (e.g. "See repo: <repo_url>" or "Contributions welcome").
    - Tone: professional, upbeat, and informative.
    - Return a JSON object only (no extra text) with keys: post_text,
    project_title, project_description, languages, frameworks, repo_url
    - project_description should be in bullets points and separated by newlines.
    Repository:
    name: {name}
    description: {description}
    languages: {languages}
    frameworks: {frameworks}
    repo_url: {repo_url}
    JSON:
    """
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        # Extract JSON block robustly
        s = text.find("{")
        e = text.rfind("}")
        if s != -1 and e != -1:
            data = json.loads(text[s:e+1])
# ensure keys exist
            return {
            "post_text": data.get("post_text") or data.get("postText") or
            "",
            "project_title": data.get("project_title") or
            data.get("projectTitle") or name,
            "project_description": data.get("project_description") or
            data.get("projectDescription") or (description[:250] if description else ""),
            "languages": data.get("languages") or languages,
            "frameworks": data.get("frameworks") or frameworks,
            "repo_url": repo_url,
            }
    except Exception as e:
        print("preview generation error:", e)
    # fallback deterministic preview
    tech_list = ", ".join((frameworks or [])[:3] or (languages or [])[:3])
    post_text = (
    f"{name} — {description[:200]} "
    f"Built with {tech_list}.\nLooking for contributors and feedback. See repo: {repo_url} {hashtag_str}"
    )
    return {
    "post_text": post_text,
    "project_title": name[:60],
    "project_description": (description or post_text)[:300],
    "languages": languages,
    "frameworks": frameworks,
    "repo_url": repo_url,
    }

# Route: preview-only (no tokens required)
@app.route("/api/linkedin/preview", methods=["POST"])
def linkedin_preview():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    if not repo_name:
        return jsonify({"error": "repoName required"}), 400
    repo_details = fetch_local_repo_details(login_id, repo_name)
    preview = generate_linkedin_preview(repo_details)
    # add a 'generatedAt' timestamp for client
    preview["generatedAt"] = datetime.utcnow().isoformat() + "Z"
    return jsonify(preview), 200

@app.route("/api/linkedin/createpost", methods=["POST"])
def linkedin_create_post():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    post_text = body.get("postText")
    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400
    if not post_text:
        return jsonify({"error": "postText required. Generate preview and send its postText to create the post."}), 400
# 1) get LinkedIn outbound token from Descope
    try:
        token_json = get_outbound_token(LINKEDIN_OUTBOUND_APP_ID, login_id)
        linkedin_access_token = extract_access_token(token_json)
        if not linkedin_access_token:
            return jsonify({"error": "no linkedin access token from Descope",
        "detail": token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed to retrieve linkedin token",
"detail": str(e)}), 500
# 2) get member id (URN) via OIDC userinfo
    try:
        userinfo_resp = requests.get(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {linkedin_access_token}"},
        timeout=10
        )
        if userinfo_resp.status_code != 200:
            return jsonify({"error": "failed to fetch linkedin userinfo",
            "status": userinfo_resp.status_code, "detail": userinfo_resp.text}), 500
        userinfo = userinfo_resp.json()
        member_id = userinfo.get("sub")
        if not member_id:
            return jsonify({"error": "no sub in userinfo", "detail":
            userinfo}), 500
        author_urn = f"urn:li:person:{member_id}"
    except Exception as e:
        return jsonify({"error": "linkedin /userinfo failed", "detail":
        str(e)}), 500
# 3) create UGC post using provided post_text
    try:
        status_code, resp = create_linkedin_ugc_post(linkedin_access_token,
        author_urn, post_text, repo_url=None, repo_title=None)
        if status_code in (200, 201):
            return jsonify({"success": True, "method": "ugc_post",
            "postResponse": resp}), 201
        else:
            return jsonify({"error": "linkedin_post_failed", "status":
            status_code, "response": resp}), 500
    except Exception as e:
        return jsonify({"error": "linkedin_post_exception", "detail":
        str(e)}), 500


def gemini_make_google_queries(languages, frameworks, repo_name=None, repo_description=None, top_k=6):
    """
    Use Gemini to generate good search queries (3-6 words) to find official docs, tutorials, and blog posts
    relevant to the repo. Returns (queries:list, description: str)
    """
    prompt = f"""
You are an expert learning curator and technical content researcher.
Given the repository: name={repo_name or 'unknown'}, description={repo_description or 'none'},
languages={languages}, frameworks={frameworks} — produce {top_k} short Google search queries (3-6 words each)
that will find official documentation pages, high-quality blog posts, and tutorials relevant to this repo.
Return a JSON object: {{ "queries": [ ... ], "notes": "brief note" }} and nothing else.
"""
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        s = text.find("{")
        e = text.rfind("}")
        if s != -1 and e != -1:
            payload = json.loads(text[s:e+1])
            qs = payload.get("queries", [])
            return qs[:top_k], payload.get("notes", "")
    except Exception as ex:
        print("gemini_make_google_queries error:", ex)
    # fallback: simple queries
    qlist = []
    for lang in (languages or [])[:3]:
        qlist.append(f"{lang} official docs")
        qlist.append(f"{lang} blog tutorial")
    for fw in (frameworks or [])[:3]:
        qlist.append(f"{fw} guide")
    if repo_name:
        qlist.insert(0, f"{repo_name} documentation")
    # dedupe & trim
    seen = []
    for q in qlist:
        if q not in seen:
            seen.append(q)
    return seen[:top_k], "Fallback queries generated"

@app.route("/api/google/suggestions", methods=["POST"])
def google_suggestions():
    """
    Request body: { loginId?, repoName, languages, frameworks, description }
    - If GOOGLE_SEARCH_CX is set the server will call Google Custom Search JSON API to fetch results.
    - Returns: { queries: [...], notes: "...", results: [{title, link, snippet}], cx_present: bool }
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    languages = body.get("languages") or []
    frameworks = body.get("frameworks") or []
    repo_name = body.get("repoName")
    repo_description = body.get("description")

    try:
        queries, notes = gemini_make_google_queries(languages, frameworks, repo_name, repo_description)
    except Exception as e:
        print("gemini google queries failed:", e)
        queries, notes = [], ""

    results = []
    if GOOGLE_SEARCH_CX and queries:
        # call Google Custom Search JSON API for each query
        for q in queries:
            try:
                url = "https://www.googleapis.com/customsearch/v1"
                params = {"key": CUSTOM_SEARCH_API_KEY, "cx": GOOGLE_SEARCH_CX, "q": q, "num": 5}
                r = requests.get(url, params=params, timeout=8)
                if r.status_code != 200:
                    print("customsearch error", r.status_code, r.text)
                    continue
                data = r.json()
                for item in data.get("items", []):
                    results.append({
                        "title": item.get("title"),
                        "link": item.get("link"),
                        "snippet": item.get("snippet"),
                        "queryMatched": q
                    })
                    # limit total results to ~20
                    if len(results) >= 20:
                        break
                if len(results) >= 20:
                    break
            except Exception as e:
                print("customsearch request failed", e)
                continue

    # If CX not present, return queries only (client can show them)
    return jsonify({
        "queries": queries,
        "notes": notes,
        "results": results,
        "cx_present": bool(GOOGLE_SEARCH_CX)
    }), 200


def _drive_create_folder_and_files(access_token: str, folder_name: str, items: list):
    """
    - access_token: user's google OAuth token (Drive access)
    - folder_name: name for the folder
    - items: list of { title, link, snippet } to store as small .txt files in folder
    Returns: (folder_id, files_created:list)
    """
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

    # 1) create folder
    print("Creating Drive folder:", folder_name)
    meta = {"name": folder_name, "mimeType": "application/vnd.google-apps.folder"}
    r = requests.post("https://www.googleapis.com/drive/v3/files", headers={**headers, "Content-Type": "application/json"}, json=meta, timeout=10)
    print("Drive folder creation response:", r.status_code, r.text)
    if r.status_code not in (200, 201):
        # surface Google's error for debugging / re-consent detection
        raise Exception(f"Drive folder creation failed: {r.status_code} {r.text}")
    folder = r.json()
    folder_id = folder.get("id")

    files_created = []
    # 2) upload each item as a small .txt file into the folder using multipart upload
    for idx, it in enumerate(items[:50]):  # safety: max 50 files
        title = (it.get("title") or f"resource-{idx+1}").replace("/", "-")[:200]
        name = f"{title}.txt"
        content = f"{it.get('title','')}\n{it.get('link','')}\n\n{it.get('snippet','')}\n"
        # prepare multipart body
        boundary = "-------driveUploadBoundary"
        metadata = {"name": name, "parents": [folder_id], "mimeType": "text/plain"}
        body = (
            f"--{boundary}\r\n"
            "Content-Type: application/json; charset=UTF-8\r\n\r\n"
            f"{json.dumps(metadata)}\r\n"
            f"--{boundary}\r\n"
            "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
            f"{content}\r\n"
            f"--{boundary}--\r\n"
        ).encode("utf-8")
        up_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": f"multipart/related; boundary={boundary}"
        }
        up_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
        ur = requests.post(up_url, headers=up_headers, data=body, timeout=20)
        if ur.status_code in (200, 201):
            created = ur.json()
            files_created.append({"id": created.get("id"), "name": created.get("name"), "mimeType": created.get("mimeType")})
        else:
            # try to continue but note the failure
            print("Drive file upload failed:", ur.status_code, ur.text)
    return folder_id, files_created


@app.route("/api/google/create-folder", methods=["POST"])
def google_create_folder():
    """
    Request body:
      { loginId, folderName(optional), items: [{title, link, snippet}, ...] }
    Flow:
      - get Descope outbound token for google-drive outbound app
      - extract google access token
      - create folder and upload .txt files containing the links/snippets
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    folder_name = body.get("folderName") or f"Repo resources - {body.get('repoName') or 'repo'} - {datetime.utcnow().strftime('%Y-%m-%d')}"
    items = body.get("items") or []

    if not login_id:
        return jsonify({"error": "loginId required"}), 400
    if not items:
        return jsonify({"error": "items required (list of {title,link,snippet})"}), 400

    # get Descope outbound token for google drive
    try:
        token_json = get_outbound_token(GOOGLE_DRIVE_OUTBOUND_APP_ID, login_id)
        google_access_token = extract_access_token(token_json)
        if not google_access_token:
            return jsonify({"error": "no google access token from Descope", "detail": token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed to retrieve google token", "detail": str(e)}), 500

    # create folder and files
    try:
        folder_id, created_files = _drive_create_folder_and_files(google_access_token, folder_name, items)
        folder_url = f"https://drive.google.com/drive/folders/{folder_id}"
        return jsonify({
            "success": True,
            "folderId": folder_id,
            "folderUrl": folder_url,
            "files": created_files
        }), 201
    except Exception as e:
        # if Google reports insufficient scope, surface hint to re-consent
        text = str(e)

        if "insufficient" in text.lower() or "permission" in text.lower():
            return jsonify({
                "error": text,
                "message": "Google returned a permission error. The user must r e-consent to the Google Drive outbound app with drive.file or drive scope.",
                "detail": text
            }), 403
        return jsonify({"error": "drive_operation_failed", "detail": text}), 500

# --- BACKEND: new helper + route (insert into your server file) ---

def gemini_generate_project_document(repo_details):
    """
    Use Gemini to generate a detailed, multi-section project document.
    Returns: (title: str, content: str) where content is plain text (markdown-style sections).
    """

    # Build a plain string prompt (avoid embedding JSON braces inside Python format placeholders)
    name = repo_details.get("name", "")
    description = repo_details.get("description", "")
    languages = ", ".join(repo_details.get("languages") or [])
    frameworks = ", ".join(repo_details.get("frameworks") or [])
    commits = repo_details.get("commits") or []

    # Compose commit summary (most recent few messages)
    recent_commits = "\n".join([f"- {c.get('date','?')}: {c.get('message','')}" for c in (commits[:6] if commits else [])])

    prompt = (
        "You are an expert technical writer and engineer. Produce a detailed, polished project document "
        "suitable for a README-style Google Doc that an engineering team can use to onboard contributors. "
        "Structure the document into clear sections (Title, Short Summary, Architecture, Key Technologies, "
        "Roadmap, "
        "Security Considerations, Troubleshooting, References/Links). "
        "Be thorough and provide practical commands, examples, and a friendly professional tone. "
        "Return a JSON object only with keys: \"title\" (string) and \"content\" (string). "
        "The content value should be plain text (you may use markdown-style headings like '#', '##') and should be "
        "suitable for direct insertion into a Google Doc body. Do NOT include any extra text outside the JSON object.\n\n"
        f"Repository name: {name}\n"
        f"Repository description: {description}\n"
        f"Languages: {languages}\n"
        f"Frameworks: {frameworks}\n"
        f"Recent commits (if any):\n{recent_commits}\n\n"
        "JSON:"
    )

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        text = text.replace("*", " ")
        # robustly extract the first JSON object found
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            json_blob = text[start:end+1]
            print(json_blob)
            try:
                title,content = try_parse_title_and_content_from_json_blob(json_blob)
                # print("Gemini project doc payload:", payload)
                # title = payload['title'] or payload.get("Title") or name
                # content = payload['content'] or payload.get("Content") or ""
                # # safe fallback trimming
                print(title,content)
                return title, content
            except Exception as e:
                print("Gemini returned non-JSON or malformed JSON; falling back. Error:", e)
        # fallback: use the raw text as content if JSON extraction failed
        fallback_title = f"{name} — Project Overview"
        fallback_content = text if text else f"# {name}\n\n{description}"
        return fallback_title, fallback_content
    except Exception as e:
        print("gemini_generate_project_document error:", e)
        return (f"{repo_details.get('name') or 'Project'} — Overview", repo_details.get('description') or "")

def create_google_doc(access_token: str, title: str):
    """
    Creates a Google Doc with the given title. Returns (documentId, documentUrl) or raises.
    Requires https://www.googleapis.com/auth/documents scope.
    """
    url = "https://docs.googleapis.com/v1/documents"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {"title": title}
    r = requests.post(url, headers=headers, json=payload, timeout=10)
    if r.status_code not in (200, 201):
        raise Exception(f"Failed to create doc: {r.status_code} {r.text}")
    d = r.json()
    doc_id = d.get("documentId")
    if not doc_id:
        raise Exception("No documentId returned from Docs API")
    doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"
    return doc_id, doc_url

def write_doc_content(access_token: str, document_id: str, content: str):
    """
    Writes plain text content into the document using the Docs batchUpdate API.
    Requires https://www.googleapis.com/auth/documents scope.
    """
    url = f"https://docs.googleapis.com/v1/documents/{document_id}:batchUpdate"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    # Insert text at index 1 (document has initial body). This is simple but effective for most uses.
    requests_payload = {
        "requests": [
            {"insertText": {"location": {"index": 1}, "text": content}}
        ]
    }
    r = requests.post(url, headers=headers, json=requests_payload, timeout=12)
    if r.status_code not in (200, 201):
        raise Exception(f"Failed to write doc content: {r.status_code} {r.text}")
    return r.json()

def share_file_with_emails(access_token: str, file_id: str, emails: list, send_notification=True):
    """
    Create 'writer' permissions for each email on the Drive file.
    Requires https://www.googleapis.com/auth/drive (or drive.file + documents?) and the Drive API enabled.
    Returns a dict mapping email -> (status_code, response_text_or_json)
    """
    results = {}
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    base = f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions"
    for email in emails:
        body = {"role": "writer", "type": "user", "emailAddress": email}
        params = {"sendNotificationEmail": "true" if send_notification else "false"}
        r = requests.post(base, headers=headers, params=params, json=body, timeout=10)
        try:
            parsed = r.json()
        except Exception:
            parsed = r.text
        results[email] = {"status": r.status_code, "response": parsed}
    return results


def try_parse_title_and_content_from_json_blob(maybe_json_str):
    """
    If the string is JSON (object) with 'title' and 'content', return (title, content).
    Otherwise return None.
    """
    if not isinstance(maybe_json_str, str):
        print(1)
        return None
    s = maybe_json_str.strip()
    if not s:
        print(2)
        return None
    # quick heuristic: if starts with { or with ```json
    if s.startswith("{") or s.startswith('```json'):
        # strip triple-backtick wrapper if present
        if s.startswith('```') and s.endswith('```'):
            print(3)
            inner = "\n".join(s.splitlines()[1:-1])
        else:
            print(4)
            inner = s
        try:
            json_str = inner.strip()
            parsed = json.loads(json_str)
            title = parsed.get("title") or parsed.get("Title") or parsed.get("name")
            content = parsed.get("content") or parsed.get("Content") or parsed.get("body")
            if isinstance(content, (dict, list)):
                # if content itself is non-string, convert to pretty JSON string
                print(6)
                content = json.dumps(content, indent=2)
            if title and isinstance(content, str):
                return title.strip(), content.strip()
        except Exception as e:
            print("JSON parse error:", e)
            return None
    return None

def _split_into_blocks_from_markdown(md_text):
    """
    Very small Markdown-ish parser that yields blocks:
      - {'type': 'heading', 'level': n, 'text': '...'}
      - {'type': 'paragraph', 'text': '...'}
      - {'type': 'list', 'style': 'bulleted'|'numbered', 'items': [...]}
      - {'type': 'code', 'text': '...'}
    """
    lines = md_text.splitlines()
    i = 0
    blocks = []

    while i < len(lines):
        line = lines[i]

        # code fence
        if line.strip().startswith("```"):
            lang = line.strip()[3:].strip()
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            # skip closing fence
            if i < len(lines) and lines[i].strip().startswith("```"):
                i += 1
            blocks.append({"type": "code", "text": "\n".join(code_lines), "lang": lang})
            continue

        # headings (#, ##, ###)
        m = re.match(r'^(#{1,6})\s+(.*)$', line)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            blocks.append({"type": "heading", "level": level, "text": text})
            i += 1
            continue

        # lists (bulleted or numbered)
        m_bullet = re.match(r'^\s*[-*]\s+(.*)$', line)
        m_number = re.match(r'^\s*\d+\.\s+(.*)$', line)
        if m_bullet or m_number:
            items = []
            style = "bulleted" if m_bullet else "numbered"
            while i < len(lines):
                lb = lines[i]
                mb = re.match(r'^\s*[-*]\s+(.*)$', lb)
                mn = re.match(r'^\s*\d+\.\s+(.*)$', lb)
                if mb:
                    items.append(mb.group(1).rstrip())
                    i += 1
                elif mn:
                    items.append(mn.group(1).rstrip())
                    i += 1
                else:
                    break
            blocks.append({"type": "list", "style": style, "items": items})
            continue

        # blank line
        if line.strip() == "":
            i += 1
            continue

        # paragraph
        para_lines = [line]
        i += 1
        while (
            i < len(lines)
            and lines[i].strip() != ""
            and not re.match(r'^(#{1,6})\s+(.*)$', lines[i])
            and not re.match(r'^\s*[-*]\s+(.*)$', lines[i])
            and not re.match(r'^\s*\d+\.\s+(.*)$', lines[i])
            and not lines[i].strip().startswith("```")
        ):
            para_lines.append(lines[i])
            i += 1
        blocks.append({"type": "paragraph", "text": "\n".join(para_lines).strip()})

    return blocks


def build_docs_requests_from_markdown(md_text):
    """
    Returns a list of docs API 'requests' suitable for documents.batchUpdate.
    """
    blocks = _split_into_blocks_from_markdown(md_text)
    reqs = []
    current_index = 1  # insert at doc start

    for block in blocks:
        if block["type"] == "heading":
            heading_text = block["text"].rstrip() + "\n"
            reqs.append({"insertText": {"location": {"index": current_index}, "text": heading_text}})
            start, end = current_index, current_index + len(heading_text)
            if block["level"] <= 2:
                named = "HEADING_1" if block["level"] == 1 else "HEADING_2"
            elif block["level"] == 3:
                named = "HEADING_3"
            else:
                named = "NORMAL_TEXT"
            reqs.append({
                "updateParagraphStyle": {
                    "range": {"startIndex": start, "endIndex": end},
                    "paragraphStyle": {"namedStyleType": named},
                    "fields": "namedStyleType"
                }
            })
            current_index = end

        elif block["type"] == "paragraph":
            para_text = block["text"].rstrip() + "\n\n"
            reqs.append({"insertText": {"location": {"index": current_index}, "text": para_text}})
            current_index += len(para_text)

        elif block["type"] == "code":
            code_text = block["text"].rstrip() + "\n\n"
            reqs.append({"insertText": {"location": {"index": current_index}, "text": code_text}})
            start, end = current_index, current_index + len(code_text)
            reqs.append({
                "updateTextStyle": {
                    "range": {"startIndex": start, "endIndex": end},
                    "textStyle": {"weightedFontFamily": {"fontFamily": "Courier New"}},
                    "fields": "weightedFontFamily"
                }
            })
            reqs.append({
                "updateParagraphStyle": {
                    "range": {"startIndex": start, "endIndex": end},
                    "paragraphStyle": {"indentStart": {"magnitude": 18, "unit": "PT"}},
                    "fields": "indentStart"
                }
            })
            current_index = end

        elif block["type"] == "list":
            start_list_index = current_index
            for it in block["items"]:
                item_text = it.rstrip() + "\n"
                reqs.append({"insertText": {"location": {"index": current_index}, "text": item_text}})
                current_index += len(item_text)
            end_list_index = current_index
            preset = "NUMBERED_DECIMAL" if block.get("style") == "numbered" else "BULLET_DISC_CIRCLE"
            reqs.append({
                "createParagraphBullets": {
                    "range": {"startIndex": start_list_index, "endIndex": end_list_index},
                    "bulletPreset": preset
                }
            })

    return reqs


def write_doc_content_formatted(access_token: str, document_id: str, raw_content: str, title: str = None):
    """
    Build requests from markdown and push to Google Docs.
    """
    reqs = build_docs_requests_from_markdown(raw_content)

    # Insert title at the very beginning
    if title:
        title_text = title.strip() + "\n\n"
        reqs.insert(0, {
            "insertText": {
                "location": {"index": 1},
                "text": title_text
            }
        })
        reqs.insert(1, {
            "updateParagraphStyle": {
                "range": {"startIndex": 1, "endIndex": 1 + len(title_text)},
                "paragraphStyle": {"namedStyleType": "HEADING_3"},
                "fields": "namedStyleType"
            }
        })

    if not reqs:
        simple_text = (raw_content.strip() + "\n")
        reqs = [{"insertText": {"location": {"index": 1}, "text": simple_text}}]

    url = f"https://docs.googleapis.com/v1/documents/{document_id}:batchUpdate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {"requests": reqs}

    resp = requests.post(url, headers=headers, json=payload)
    if resp.status_code not in (200, 201):
        print("Failed payload:", json.dumps(payload, indent=2))
        raise Exception(f"Failed to write doc content: {resp.status_code} {resp.text}")
    return resp.json()



def requests_post_with_retry(url, headers=None, json=None, params=None, timeout=12, retries=1):
    for attempt in range(retries + 1):
        try:
            return requests.post(url, headers=headers, params=params, json=json, timeout=timeout)
        except requests.exceptions.RequestException as ex:
            last_exc = ex
            if attempt >= retries:
                raise
    raise last_exc


@app.route("/api/google/create-doc-and-share", methods=["POST"])
def google_create_doc_and_share():
    """
    Request body: { loginId, repoName }
    Flow:
      - fetch repo details (local helper)
      - generate document (Gemini)
      - get Google access token via Descope outbound (google-drive app)
      - create Google Doc + write content
      - fetch repo collaborators via GitHub outbound + map to emails in DB
      - share the doc with those emails (Drive permissions)
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400

    # fetch repo details (local helper)
    repo_details = fetch_local_repo_details(login_id, repo_name)

    # 1) generate large document content using Gemini
    try:
        title, content = gemini_generate_project_document(repo_details)
       
    except Exception as e:
        return jsonify({"error": "gemini_failed", "detail": str(e)}), 500

    # 2) get Google outbound token from Descope
    try:
        token_json = get_outbound_token(GOOGLE_DRIVE_OUTBOUND_APP_ID, login_id)
        google_access_token = extract_access_token(token_json)
        if not google_access_token:
            return jsonify({"error": "no_google_access_token", "detail": token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed_to_get_google_token", "detail": str(e)}), 500

    # 3) create Google Doc
    try:
        doc_id, doc_url = create_google_doc(google_access_token, title)
    except Exception as e:
        # detect insufficient scopes from Google error strings and normalize response
        emsg = str(e)
        if "insufficient" in emsg.lower() or "permission_denied" in emsg.lower() or "insufficientPermissions" in emsg:
            return jsonify({"error": "google_insufficient_scope", "message": "Google token lacks required docs/drive scopes", "detail": emsg}), 403
        return jsonify({"error": "create_doc_failed", "detail": emsg}), 500

    try:
    # doc_id and doc_url were created with create_google_doc(...)
        print("Created doc:", doc_id, doc_url)
        write_resp = write_doc_content_formatted(google_access_token, doc_id,title, content)
    except Exception as e:
        emsg = str(e)
        if "insufficient" in emsg.lower() or "permission_denied" in emsg.lower():
            return jsonify({"error": "google_insufficient_scope", "message": "Google token lacks required docs/drive scopes", "detail": emsg}), 403
        return jsonify({"error": "write_doc_failed", "detail": emsg}), 500

    # 5) determine collaborator emails:
    shared_emails = []
    try:
        # fetch GitHub collaborators via outbound token (requires github outbound)
        gh_token_json = get_outbound_token("github", login_id)
        gh_access_token = extract_access_token(gh_token_json)
        if gh_access_token:
            owner_login, collaborators = fetch_github_user_and_collaborators(gh_access_token, repo_name)
            collab_logins = [c.get("login") for c in (collaborators or []) if c.get("login")]
            # look up emails in DB
            if collab_logins:
                docs = users_collection.find({"connectedAccounts.github.login": {"$in": collab_logins}})
                for d in docs:
                    em = d.get("email")
                    if em:
                        shared_emails.append(em)
    except Exception as ex:
        # non-fatal; we can still return docUrl and indicate that sharing failed/was skipped
        print("Warning: failed to fetch collaborator emails:", ex)

    shared_emails = list(dict.fromkeys(shared_emails))  # dedupe

    # 6) share with collaborators (if any)
    permission_results = {}
    if shared_emails:
        try:
            permission_results = share_file_with_emails(google_access_token, doc_id, shared_emails, send_notification=True)
        except Exception as e:
            # surface share errors but do not treat as fatal
            permission_results = {"error": str(e)}

    return jsonify({
        "success": True,
        "documentId": doc_id,
        "documentUrl": doc_url,
        "sharedWith": shared_emails,
        "permissionResults": permission_results
    }), 200


# --- Helpers: robust JSON extraction from model output ---
def _extract_first_json_block(text: str):
    """Return Python object parsed from first JSON object/array found in text, or None."""
    if not text:
        return None
    # try to find an array '[' or object '{'
    first_obj = None
    for opener, closer in [('{', '}'), ('[', ']')]:
        start = text.find(opener)
        end = text.rfind(closer)
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end+1]
            try:
                return json.loads(candidate)
            except Exception:
                # attempt small cleanups then try again
                try:
                    cleaned = candidate.encode('utf-8', 'surrogateescape').decode('unicode_escape', 'ignore')
                    return json.loads(cleaned)
                except Exception:
                    continue
    return None

# --- Helper: sample repository files (like you used elsewhere) ---
def _sample_repo_code_for_analysis(access_token: str, owner: str, repo_name: str, max_files=8):
    """Return list of short file snippets useful for analysis"""
    headers = {"Authorization": f"token {access_token}", "Accept": "application/vnd.github+json", "User-Agent": "descope-demo-app"}
    tree_url = f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/main?recursive=1"
    r = requests.get(tree_url, headers=headers, timeout=10)
    files = []
    if r.status_code == 200:
        tree = r.json().get("tree", [])
        for item in tree:
            if item.get("type") != "blob":
                continue
            path = item.get("path", "")
            if any(path.endswith(s) for s in (".py", ".js", ".jsx", ".ts", ".tsx", ".md", ".java", ".go", ".rb", ".php", ".html", ".css", ".sh")):
                # fetch content
                file_url = f"https://api.github.com/repos/{owner}/{repo_name}/contents/{quote_plus(path)}"
                fr = requests.get(file_url, headers=headers, timeout=8)
                if fr.status_code == 200:
                    fd = fr.json()
                    content_b64 = fd.get("content") or ""
                    try:
                        snippet = base64.b64decode(content_b64).decode("utf-8", errors="ignore")
                        # keep first N chars
                        files.append({"path": path, "content": snippet[:1600]})
                    except Exception:
                        continue
                if len(files) >= max_files:
                    break
    return files

# --- Gemini-based generator for feature ideas ---
def _generate_feature_ideas_with_gemini(sample_files, repo_name: str, open_source: bool, top_k=8):
    """
    Given sampled files (list of {path, content}), ask Gemini to return JSON array of feature suggestions:
      [{ "title": "...", "description": "...", "labels": ["enhancement","docs"], "estimate": "2d" }, ...]
    Returns parsed list or fallback list of simple suggestions.
    """
    sample_text = "\n\n".join([f"File: {f['path']}\n{f['content']}" for f in (sample_files or [])])
    prompt = (
        "You are an expert engineering manager and product designer. Given the repository code snippets below, "
        "generate a prioritized list of practical, implementable feature ideas (not vague wishes) that would "
        "improve this project for users and maintainers. For each feature provide a short title (6-10 words), "
        "a 1-3 sentence implementation description, optional suggested GitHub labels (as an array), and a rough estimate "
        "(e.g., '2d', '4h'). Return EXACTLY one JSON array only (no extra commentary). Example item:\n\n"
        '[{"title":"Add CI with GitHub Actions","description":"Add a GitHub Actions workflow that runs tests...","labels":["ci","automation"],"estimate":"1d"}, ...]\n\n'
        f"Repo name: {repo_name}\nOpen source: {open_source}\n\nCode samples:\n{sample_text}\n\nJSON:"
    )
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt)
        text = (resp.text or "").strip()
        parsed = _extract_first_json_block(text)
        if isinstance(parsed, list) and parsed:
            # normalize items
            out = []
            for i, it in enumerate(parsed):
                t = it.get("title") if isinstance(it, dict) else str(it)
                d = it.get("description") if isinstance(it, dict) else ""
                labels = it.get("labels") if isinstance(it, dict) else []
                est = it.get("estimate") if isinstance(it, dict) else ""
                out.append({
                    "id": f"f{i}-{abs(hash(t))%100000}",
                    "title": (t or f"Feature {i+1}").strip(),
                    "description": (d or "").strip(),
                    "labels": labels if isinstance(labels, list) else [],
                    "estimate": est or ""
                })
            return out
    except Exception as e:
        print("gemini feature generation failed:", e)

    # fallback simple heuristics: return small feature templates using repo_name
    fallback = [
        {"id": "f-fallback-1", "title": "Add README badges and CI", "description": "Add GitHub Actions to run tests and include badges (build/test/coverage) in README.", "labels": ["ci"], "estimate": "1d"},
        {"id": "f-fallback-2", "title": "Improve contributing docs", "description": "Add CONTRIBUTING.md with guidelines for PRs, coding style and testing.", "labels": ["docs"], "estimate": "4h"},
        {"id": "f-fallback-3", "title": "Add issue templates", "description": "Provide bug and feature request templates to improve triage.", "labels": ["enhancement"], "estimate": "2h"}
    ]
    return fallback

# --- Route: generate feature ideas ---
@app.route("/api/github/features/generate", methods=["POST"])
def github_features_generate():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    open_source = bool(body.get("openSource", True))
    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400

    # get outbound github token for the user
    try:
        token_json = get_outbound_token("github", login_id)
        access_token = extract_access_token(token_json)
        if not access_token:
            # sometimes token_json has nested token field
            access_token = token_json.get("token", {}).get("accessToken")
        if not access_token:
            return jsonify({"error": "no github access token returned", "detail": token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed_to_get_github_token", "detail": str(e)}), 500

    # identify owner/login (authenticated user)
    try:
        user_resp = requests.get("https://api.github.com/user", headers={"Authorization": f"token {access_token}"}, timeout=8)
        if user_resp.status_code != 200:
            return jsonify({"error": "github_user_failed", "detail": user_resp.text}), 500
        owner = user_resp.json().get("login")
    except Exception as e:
        return jsonify({"error": "github_user_failed", "detail": str(e)}), 500

    # sample repo code
    sample_files = _sample_repo_code_for_analysis(access_token, owner, repo_name, max_files=8)

    # generate ideas with Gemini
    features = _generate_feature_ideas_with_gemini(sample_files, repo_name, open_source, top_k=8)

    return jsonify({"features": features})

# --- Helper: create GitHub issues on behalf of user using their outbound token ---
def _create_github_issues(access_token: str, owner: str, repo_name: str, issues: list):
    """
    issues: list of { title, body, labels: [..] (optional) }
    Returns created list and failed list.
    """
    headers = {"Authorization": f"token {access_token}", "Accept": "application/vnd.github+json", "User-Agent": "descope-demo-app"}
    created = []
    failed = []
    for it in issues:
        payload = {"title": it.get("title", "Untitled"), "body": it.get("body", "")}
        if it.get("labels"):
            payload["labels"] = it.get("labels")
        url = f"https://api.github.com/repos/{owner}/{repo_name}/issues"
        r = requests.post(url, headers=headers, json=payload, timeout=12)
        if r.status_code in (200, 201):
            j = r.json()
            created.append({"title": payload["title"], "issueNumber": j.get("number"), "url": j.get("html_url")})
        else:
            failed.append({"title": payload["title"], "status": r.status_code, "detail": r.text})
    return created, failed

@app.route("/api/github/features/create-issues", methods=["POST"])
def github_features_create_issues():
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    issues = body.get("issues") or []  # [{title, body, labels?}, ...]
    open_source = bool(body.get("openSource", True))
    if not login_id or not repo_name or not issues:
        return jsonify({"error": "loginId, repoName and issues required"}), 400

    # get github token via Descope outbound
    try:
        token_json = get_outbound_token("github", login_id)
        access_token = extract_access_token(token_json)
        if not access_token:
            access_token = token_json.get("token", {}).get("accessToken")
        if not access_token:
            return jsonify({"error": "no github token from descope", "detail": token_json}), 500
    except Exception as e:
        return jsonify({"error": "failed_to_get_github_token", "detail": str(e)}), 500

    # get owner login
    user_resp = requests.get("https://api.github.com/user", headers={"Authorization": f"token {access_token}"}, timeout=8)
    if user_resp.status_code != 200:
        return jsonify({"error": "github_user_failed", "detail": user_resp.text}), 500
    owner = user_resp.json().get("login")

    # Create issues
    created, failed = _create_github_issues(access_token, owner, repo_name, issues)

    return jsonify({"created": created, "failed": failed}), (200 if not failed else 207)

def _get_github_owner_and_token(login_id):
    """Return (owner_login, access_token) or raise."""
    token_json = get_outbound_token("github", login_id)
    access_token = extract_access_token(token_json)
    if not access_token:
        access_token = token_json.get("token", {}).get("accessToken")
    if not access_token:
        raise Exception(f"No github access token from Descope: {token_json}")
    # get user login
    resp = requests.get("https://api.github.com/user", headers={"Authorization": f"token {access_token}"}, timeout=8)
    if resp.status_code != 200:
        raise Exception(f"GitHub user request failed: {resp.status_code} {resp.text}")
    owner = resp.json().get("login")
    return owner, access_token


@app.route("/api/github/readme/get", methods=["POST"])
def github_readme_get():
    """
    POST { loginId, repoName }
    Returns: { exists: bool, content: <string markdown>, path, sha } or { exists: false }
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    if not login_id or not repo_name:
        return jsonify({"error": "loginId and repoName required"}), 400

    try:
        owner, access_token = _get_github_owner_and_token(login_id)
    except Exception as e:
        return jsonify({"error": "failed_to_get_github_token", "detail": str(e)}), 500

    # Use the repo readme endpoint which finds README with different names
    url = f"https://api.github.com/repos/{owner}/{repo_name}/readme"
    r = requests.get(url, headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github+json"}, timeout=10)
    if r.status_code == 404:
        return jsonify({"exists": False})
    if r.status_code != 200:
        return jsonify({"error": "failed_fetch_readme", "detail": r.text}), 500

    j = r.json()
    content_b64 = j.get("content", "")
    try:
        content = base64.b64decode(content_b64).decode("utf-8", errors="ignore") if content_b64 else ""
    except Exception:
        content = ""
    return jsonify({
        "exists": True,
        "content": content,
        "path": j.get("path"),
        "sha": j.get("sha")
    })


@app.route("/api/github/readme/suggest", methods=["POST"])
def github_readme_suggest():
    """
    POST { loginId, repoName }
    Returns: { suggested: "<markdown>" }
    If loginId is missing or token retrieval fails, still uses _sample_repo_code_for_analysis fallback where possible.
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    if not repo_name:
        return jsonify({"error": "repoName required"}), 400

    access_token = None
    owner = None
    try:
        if login_id:
            owner, access_token = _get_github_owner_and_token(login_id)
    except Exception as e:
        # continue: we can still try to sample via public repo access if desired, but fall back gracefully
        print("warning: couldn't get github token for suggestion:", e)

    # sample repo files to include in prompt (tries authenticated if token provided)
    sample_files = []
    if access_token and owner:
        sample_files = _sample_repo_code_for_analysis(access_token, owner, repo_name, max_files=6)
    else:
        # if unauthenticated, try unauthenticated repo content (best-effort)
        try:
            # try public repository's tree (best-effort, may 404)
            tree_url = f"https://api.github.com/repos/{repo_name}/git/trees/main?recursive=1"
            tr = requests.get(tree_url, timeout=8)
            if tr.status_code == 200:
                tree = tr.json().get("tree", [])
                files = []
                for item in tree:
                    if item.get("type") != "blob":
                        continue
                    path = item.get("path", "")
                    if any(path.endswith(s) for s in (".md", ".py", ".js", ".jsx", ".ts", ".tsx", ".html")):
                        # attempt to fetch content via raw.githubusercontent
                        raw_url = f"https://raw.githubusercontent.com/{repo_name}/main/{path}"
                        fr = requests.get(raw_url, timeout=6)
                        if fr.status_code == 200:
                            files.append({"path": path, "content": fr.text[:1600]})
                        if len(files) >= 4:
                            break
                sample_files = files
        except Exception:
            sample_files = []

    # Build prompt for Gemini: ask for README.md in markdown with typical sections
    sample_text = "\n\n".join([f"File: {f['path']}\n{f['content']}" for f in (sample_files or [])])
    prompt = f"""
You are an expert software engineer and technical writer. Given the repository name "{repo_name}" and the following code samples, write a concise, practical README.md in Markdown that a developer can read to understand the project, install and run it, see a simple usage example, run tests (if applicable), and contribute. Include sections where appropriate: Title, Short description (1-2 lines), Installation, Usage/Examples, Contributing, License (suggest MIT if unknown). Keep the README under ~1500-2000 words and produce valid Markdown only (no extra commentary). Do not add ```markdown blocks around the content; return raw markdown only. The readme should explain features and usage based on the code samples, but do not hallucinate features or details not inferable from the code. If the code is insufficient to determine usage, keep those sections brief and generic. Use GitHub-flavored markdown where appropriate. Do not explain the endpoints in detail.

Repository name: {repo_name}

Code samples (if any):
{sample_text}

README.md:
"""
    suggested = "No suggestion available."
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt)
        suggested = (resp.text or "").strip()
        # sanitize: ensure markdown-only
        # If Gemini returns extra commentary, take full text — client will render it as README.md
    except Exception as e:
        print("gemini readme generate error:", e)
        suggested = "No suggestion available."

    return jsonify({"suggested": suggested})


@app.route("/api/github/readme/apply", methods=["POST"])
def github_readme_apply():
    """
    POST { loginId, repoName, content, commitMessage? }
    Creates or updates README.md in the repository using the user's GitHub token (via Descope).
    """
    body = request.get_json() or {}
    login_id = body.get("loginId")
    repo_name = body.get("repoName")
    content = body.get("content") or ""
    commit_message = body.get("commitMessage") or f"Add/Update README.md via futurecommit"

    if not login_id or not repo_name or not content:
        return jsonify({"error": "loginId, repoName and content required"}), 400

    try:
        owner, access_token = _get_github_owner_and_token(login_id)
    except Exception as e:
        return jsonify({"error": "failed_to_get_github_token", "detail": str(e)}), 500

    # Check if README exists to obtain sha for update
    readme_url = f"https://api.github.com/repos/{owner}/{repo_name}/readme"
    r = requests.get(readme_url, headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github+json"}, timeout=10)

    sha = None
    path = "README.md"
    if r.status_code == 200:
        j = r.json()
        sha = j.get("sha")
        path = j.get("path") or "README.md"

    put_url = f"https://api.github.com/repos/{owner}/{repo_name}/contents/{path}"
    payload = {
        "message": commit_message,
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
    }
    if sha:
        payload["sha"] = sha

    put_resp = requests.put(put_url, headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github+json"}, json=payload, timeout=15)
    if put_resp.status_code not in (200, 201):
        return jsonify({"error": "failed_to_create_update_readme", "status": put_resp.status_code, "detail": put_resp.text}), 500

    pj = put_resp.json()
    file_info = pj.get("content") or {}
    html_url = file_info.get("html_url") or f"https://github.com/{owner}/{repo_name}/blob/main/{path}"
    return jsonify({"success": True, "html_url": html_url, "path": path})



if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))