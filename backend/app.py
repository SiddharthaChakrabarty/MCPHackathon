import os
import requests
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai


load_dotenv()
DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID", "P31EeCcDPtwQGyi9wbZk4ZLKKE5a")
DESCOPE_MANAGEMENT_KEY = os.getenv("DESCOPE_MANAGEMENT_KEY", "K31Q3LIgVwny7Wdt5zt0cbxX8RXuESLJqoZRT3LLsVcFmwofUfhcSQOBY73l8HVp5rMjbMC")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY","AIzaSyAVSGUozgbc7AQs4xEhP_-xaTGtN78HBFU")
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
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        import json
        tech_info = json.loads(response.text.strip())
        languages = tech_info.get("languages", [])
        frameworks = tech_info.get("frameworks", [])
    except Exception:
        languages = []
        frameworks = []

    # Commit history
    commits_resp = requests.get(f"https://api.github.com/repos/{user_login}/{repo_name}/commits", headers=headers, params={"per_page": 100})
    commits = []
    if commits_resp.status_code == 200:
        for c in commits_resp.json():
            commit = c.get("commit", {})
            date = commit.get("author", {}).get("date")
            message = commit.get("message")
            commits.append({"date": date, "message": message})

    return jsonify({
        "name": repo_name,
        "url": repo_url,
        "description": description,
        "languages": languages,
        "frameworks": frameworks,
        "commits": commits
    })

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
