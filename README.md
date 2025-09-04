# FutureCommit  

**Commit to your growth, not just your code.**  

---

## Index  

1. [Team](#team)
2. [Demo Video](#demo-video)
3. [Pitch Deck](#pitch-deck)  
4. [Hackathon Theme / Challenge Addressed](#hackathon-theme--challenge-addressed)  
5. [Project Name & Short Description](#project-name--short-description)  
6. [How to Run It](#how-to-run-it)  
7. [Problem Statement](#problem-statement)  
8. [Our Solution](#our-solution)  
   - [Features](#features)  
9. [User Onboarding & GitHub Analysis](#user-onboarding--github-analysis)  
10. [AI-Powered Onboarding & Release Notes](#ai-powered-onboarding--release-notes)  
11. [Seamless Collaboration & Project Update](#seamless-collaboration--project-update)  
12. [Learning Resources](#learning-resources)  
13. [Tech Stack](#tech-stack)  
14. [Descope Integrations](#descope-integrations)  
15. [What We'd Do With More Time](#what-wed-do-with-more-time)  
16. [Impact and Benefits for Users](#impact-and-benefits-for-users)  
17. [Technology Comparison](#technology-comparison)  
18. [Business Relevance & Adoption Model](#business-relevance--adoption-model)  

---

## Team  
- **Team Name**: CodeLatte  
- **Members**:  
  - Sneha Jain  
  - Siddhartha Chakrabarty
 
---

## Demo Video  
[Watch the Demo Video]()

---

## Pitch Deck  
[View the Pitch Deck (PPT)](https://docs.google.com/presentation/d/1W0eYCqcEFejYqQtH3SyegxkEeUaPx_5AEg7e7j2ME1U/edit?usp=sharing)  

---

## Hackathon Theme / Challenge Addressed  
**Theme 1: Build a purposeful AI agent**  

---

## Project Name & Short Description  
**FutureCommit** is an AI-powered developer productivity platform that integrates with GitHub, Slack, Google Workspace, YouTube, and LinkedIn to help developers:  

- Automate repo onboarding docs.  
- Generate missing descriptions/readmes.  
- Analyze commit history & auto-generate release notes.  
- Share updates across Slack, LinkedIn, and Drive.  
- Recommend learning resources (YouTube playlists, blogs).  
- Streamline collaboration with auto-generated Google Meet links.  

Powered by **Descope authentication**, **LangGraph AI pipelines**, and **MongoDB for storage**.  

---

## How to run it

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/SiddharthaChakrabarty/MCPHackathon.git
    cd MCPHackathon
    ```

2.  **Backend Setup:**

    *   Navigate to the `backend` directory:

        ```bash
        cd backend
        ```

    *   Create a `.env` file.  Add the following environment variables:

        ```
        DESCOPE_PROJECT_ID=<your_descope_project_id>
        DESCOPE_MANAGEMENT_KEY=<your_descope_management_key>
        GOOGLE_API_KEY=<your_google_api_key>
        YOUTUBE_OUTBOUND_APP_ID=youtube
        YOUTUBE_API_KEY=<your_youtube_api_key>
        MONGO_URI=<your_mongodb_connection_string>
        GOOGLE_CALENDAR_OUTBOUND_APP_ID=google-calendar
        LINKEDIN_OUTBOUND_APP_ID=linkedin
        GOOGLE_SEARCH_CX=<your_google_search_cx>
        GOOGLE_DRIVE_OUTBOUND_APP_ID=google-drive
        CUSTOM_SEARCH_API_KEY=<your_custom_search_api_key>
        ```

        Replace the placeholder values with your actual credentials.

    *   Install the required Python packages:

        ```bash
        pip install -r requirements.txt 
        ```

    *   Run the Flask application:

         ```bash
        python app.py
        ```

        This will start the backend server, typically on port 5000.
        

3.  **Frontend Setup:**

    *   Navigate to the `frontend` directory:

        ```bash
        cd ../frontend
        ```

    *   Install the required Node.js packages:

        ```bash
        npm install
        ```

    *   Start the Vite development server:

        ```bash
        npm run dev
        ```

        This will start the frontend development server, typically on port 5173.


---

## Problem Statement  

<img width="1192" height="671" alt="image" src="https://github.com/user-attachments/assets/ba06646a-694c-4f01-b784-17c4c491e05e" />


Developers face several challenges when working on collaborative projects:  

- **Wasted time** due to lack of proper descriptions & README files.  
- **Unstructured documentation** makes onboarding new members painful.  
- **Collaboration & communication issues** arise when juggling multiple tools.  
- **Commit history management** and reverting to older versions is tedious without proper release notes.  
- **Learning the tech stack** for a project is scattered across multiple platforms, slowing down productivity.  

FutureCommit addresses these issues by automating documentation, improving collaboration, and centralizing resources across platforms.

---

## Our Solution  

<img width="1195" height="669" alt="image" src="https://github.com/user-attachments/assets/2e91a090-36ac-4e2e-96ad-5fa5e8b9e564" />

FutureCommit provides an AI-driven ecosystem that simplifies collaboration, documentation, and onboarding across projects.  
By leveraging **LangGraph pipelines** and seamless tool integrations, it addresses the key challenges faced by developers.  

## Features  

| Feature                     | Description |
|------------------------------|-------------|
| **Automated Repo Analysis** | Auto-generates missing descriptions or README files using the LangGraph pipeline, and creates **GitHub issues for future features** to keep repos up to date. |
| **AI-powered Onboarding**  | Analyzes the repository and creates structured onboarding documents that are automatically appended to READMEs for new contributors. |
| **AI-based Release Notes** | Generates concise, consistent release notes and appends them directly to the README for easy reference. |
| **Seamless Collaboration** | Shares Google Meet links, onboarding docs, and release notes via Google Drive and Slack, streamlining team communication. |
| **Project Updates**        | Publishes project updates to LinkedIn using LangGraph pipelines and the LinkedIn Outbound App, boosting project visibility. |
| **Learning Resources**     | Curates and suggests relevant tech stack resources in the form of playlists and collections, ensuring developers have everything they need in one place. |

---

**FutureCommit ensures projects remain structured, transparent, and collaborative — reducing friction for developers and maximizing productivity.**  

---


## User Onboarding & GitHub Analysis  

<img width="1195" height="672" alt="image" src="https://github.com/user-attachments/assets/549fd060-bfde-465d-8b0b-62c2be7a3a99" />

FutureCommit simplifies the onboarding process and integrates deeply with GitHub to provide automated insights, documentation, and issue creation.  

| Step                   | Description |
|------------------------|-------------|
| **User Authentication** | Users sign up or log in using **Descope**, ensuring secure access. |
| **Data Storage**        | User details (Email ID & GitHub username) are securely stored in **MongoDB** for identity management. |
| **GitHub Integration**  | Through the **Descope GitHub Outbound App**, user accounts are linked with GitHub repositories. |
| **Repo Analysis**       | **LangGraph** analyzes repositories, detecting missing descriptions, READMEs, and potential improvements. |
| **Auto-Docs & Issues**  | Missing descriptions and README files are generated, and **issues for future features & improvements** are automatically created in GitHub. |

---

This flow ensures **secure onboarding, persistent user identity, and intelligent GitHub repo analysis** powered by LangGraph automation.  

---
## AI-Powered Onboarding & Release Notes  

<img width="1195" height="672" alt="image" src="https://github.com/user-attachments/assets/eabb5274-d8ef-48fc-968b-b6c34194db50" />


FutureCommit leverages AI and automation to streamline onboarding and release documentation.  

| Step                          | Description |
|-------------------------------|-------------|
| **Repo & Commit Analysis**   | **LangGraph** scans repositories and commit history to identify important changes. |
| **Auto-Generated Docs**      | Generates structured **Onboarding Docs** and **Release Notes**. |
| **GitHub & README Updates**  | Updates are appended to **README files** directly in repositories. |
| **Slack Integration**        | Through the **Descope Slack Outbound App**, release docs are shared automatically in project channels. |
| **Identity Management**      | **MongoDB** retrieves collaborator details (GitHub username → Email ID) for Slack automation. |

---

This flow ensures **faster onboarding, clear release tracking, and seamless sharing across GitHub and Slack.**

---

## Seamless Collaboration & Project Update  

<img width="1195" height="672" alt="image" src="https://github.com/user-attachments/assets/e44fc8b6-1e0b-4688-b208-c6562065c2d4" />

FutureCommit enhances collaboration by automating communication and project updates.  

| Step                          | Description |
|-------------------------------|-------------|
| **Collaborator Fetch**       | **MongoDB + GitHub** fetch collaborator data securely. |
| **Meet Scheduling**          | **Descope Google Meet Outbound App** auto-generates meeting links and emails them to contributors. |
| **Slack Automation**         | **Descope Slack Outbound App** creates dedicated channels for real-time collaboration. |
| **Project Updates**          | **LangGraph** generates concise **project update summaries**. |
| **LinkedIn Integration**     | **Descope LinkedIn Outbound App** posts instant updates to LinkedIn for wider visibility. |

---

This flow ensures **seamless collaboration with instant meetings, Slack communication, and AI-driven updates across platforms.**

---

## Learning Resources  

<img width="1195" height="672" alt="image" src="https://github.com/user-attachments/assets/0e48dfe0-a4f9-4bc2-9a41-d391a8fbe8f6" />

FutureCommit supports contributor growth with curated AI-powered learning recommendations.  

| Step                          | Description |
|-------------------------------|-------------|
| **Repo Analysis**            | **LangGraph** analyzes project tech stack from GitHub repos. |
| **YouTube Suggestions**      | Generates recommended **YouTube videos** based on technologies used. |
| **Google Blogs**             | Suggests relevant **Google Blogs** and developer articles. |
| **Playlists & Collections**  | **Descope YouTube Outbound App** creates playlists, and **Descope Google Drive Outbound App** organizes blogs into Drive. |
| **Resource Sharing**         | Contributors instantly access curated playlists and collections. |

---

This flow ensures contributors **quickly upskill with project-relevant blogs, videos, and curated learning materials.**

---

## Tech Stack  

<img width="1195" height="672" alt="image" src="https://github.com/user-attachments/assets/7658086f-2d8b-42f2-973a-7f0e0f7a0dec" />

FutureCommit is built on a modern tech stack combining **AI, automation, and scalable deployment**.  

| Category                     | Technologies |
|------------------------------|---------------|
| **Frontend**                | React, Tailwind CSS |
| **Backend**                 | Flask, Python |
| **Database & Authentication** | MongoDB, Descope |
| **AI & Visualization**      | LangGraph, Recharts |
| **Outbound Apps**           | GitHub, Google Docs, Slack, Google, YouTube, LinkedIn, Google Drive, Google Meet |
| **Deployment**              | Vercel |

---

This stack ensures **secure authentication, intelligent AI-powered insights, and smooth deployment** with powerful integration options.

---

## Descope Integrations  

<img width="1195" height="672" alt="image" src="https://github.com/user-attachments/assets/fd6693b3-45a9-4798-b5d7-6d8e78bef2d8" />

Descope powers authentication and seamless outbound integrations, enabling FutureCommit to automate tasks across platforms.  

| Integration                  | Purpose |
|------------------------------|---------|
| **GitHub Outbound App**     | Fetches user repository details for AI-driven analysis. |
| **Google Docs Outbound App** | Generates **onboarding docs** & **release notes** automatically. |
| **Slack Outbound App**      | Facilitates communication between collaborators. |
| **YouTube Outbound App**    | Creates playlists of recommended learning videos. |
| **Google Drive Outbound App** | Organizes collections of Google blogs and resources. |
| **Google Outbound App**     | Fetches blog/article suggestions relevant to repo tech stack. |
| **LinkedIn Outbound App**   | Posts automated **project updates** for visibility. |
| **Google Meet Outbound App** | Auto-generates meeting links and shares with collaborators. |
| **Descope Authentication**  | Provides secure **sign-up / sign-in flow** for identity management. |

---

This integration ensures **frictionless authentication and end-to-end automation** across collaboration, learning, and release workflows.

---

## What We'd Do With More Time  

FutureCommit was built within limited hackathon time, but with more time we would:  

- **Deeper GitHub Insights**  
  Expand LangGraph analysis to include code quality checks, dependency scanning, and vulnerability detection.  

- **Customizable AI Agents**  
  Allow teams to configure AI pipelines for specific needs like bug triaging, PR reviews, or automated testing recommendations.  

- **Advanced Release Workflows**  
  Introduce version tagging, changelog visualization, and multi-repo release coordination.  

- **Marketplace & Integrations**  
  Publish FutureCommit as a GitHub Marketplace App and extend outbound integrations to Jira, Confluence, and Microsoft Teams.  

---

## Impact and Benefits for Users  

| Impact / Benefit            | Description |
|------------------------------|-------------|
| **Time Efficiency**          | Eliminates the need for manually writing READMEs, onboarding docs, and release notes by automating documentation. |
| **Seamless Onboarding**      | Provides structured onboarding guides to collaborators across GitHub and Slack, ensuring faster project ramp-up. |
| **Improved Collaboration**   | Centralizes communication and documentation across GitHub, Slack, Google Meet, LinkedIn, and more, reducing tool-switching chaos. |
| **Commit Insights**          | Analyzes commit history and auto-generates release notes with visualizations, making version tracking effortless. |
| **Learning Resource Curation** | Suggests YouTube playlists and blog collections relevant to the project’s tech stack, saving developers hours of research. |
| **Scalable Workflow**        | Supports multiple projects and repositories while integrating smoothly with existing workflows, making it future-ready. |

---

**Overall Impact**  
FutureCommit empowers developers and teams by **reducing manual overhead, accelerating onboarding, enhancing collaboration, and curating knowledge resources** — enabling them to focus more on innovation and growth rather than repetitive tasks.  

---

## Technology Comparison  

| Feature / Capability        | **FutureCommit (Our Technology)** | **Traditional Project Tools** | **Basic Automation Scripts** |
|------------------------------|----------------------------------|-------------------------------|------------------------------|
| **Documentation Generation** | Auto-generates repo descriptions, READMEs, and onboarding docs via AI | Manual effort required by developers | Limited templates, no intelligence |
| **Collaboration & Communication** | Seamlessly integrates with Slack, Google Meet, LinkedIn, YouTube, and Google Drive | Requires juggling multiple disconnected tools | No direct collaboration features |
| **Commit Analysis & Release Notes** | AI-driven commit history analysis with visualizations and automated release notes | Manual tracking and release management | Basic version tracking only |
| **Learning Resource Curation** | Creates YouTube playlists & blog collections tailored to the project’s tech stack | Developers search and curate resources manually | Very limited, often missing |
| **Onboarding Experience** | Automated, structured onboarding shared across repo, Slack, and docs | Time-consuming, inconsistent onboarding across teams | Minimal support for onboarding |
| **Integration & Scalability** | Works across GitHub, Slack, Google Workspace, LinkedIn, and more | Siloed platforms with limited interoperability | Scripts break when scaling beyond small projects |

---

**Why FutureCommit Stands Out**  
Unlike traditional tools or basic automation, FutureCommit **centralizes project knowledge, automates repetitive workflows, and enhances collaboration** across multiple platforms — all powered by AI.  

---

## Business Relevance & Adoption Model  

FutureCommit provides an intelligent and automated way for organizations to improve developer productivity, streamline collaboration, and accelerate onboarding. By integrating with existing developer tools and platforms, it fits seamlessly into various business environments.  

### Business Integration & Benefits  

| Business Integration         | Description |
|-------------------------------|-------------|
| **Software Development Teams** | Automate documentation, release notes, and onboarding guides, saving time and improving collaboration. |
| **Tech Companies & Startups** | Adopt FutureCommit as a productivity enhancer to reduce developer ramp-up time and improve code quality. |
| **Enterprises** | Streamline project collaboration across Slack, Google Workspace, and GitHub to improve communication and efficiency. |
| **EdTech & Coding Bootcamps** | Provide students with structured onboarding docs, curated learning playlists, and blogs on tech stacks, enhancing the learning experience. |
| **Consulting Firms** | Use FutureCommit to manage multiple client projects with automated documentation, meeting scheduling, and progress tracking. |

---

### Why Businesses Should Adopt FutureCommit  

- **Boost Productivity**: Automates repetitive tasks like writing docs, generating release notes, and resource curation.  
- **Faster Onboarding**: New team members can quickly get up to speed with auto-generated onboarding documents and curated learning materials.  
- **Enhanced Collaboration**: Bridges multiple platforms (GitHub, Slack, Google, LinkedIn, YouTube) into a single AI-driven workflow.  
- **Consistency & Accuracy**: Ensures documentation, release notes, and communication remain structured and up-to-date.  
- **Scalable Solution**: Works for small dev teams as well as large enterprises with complex collaboration needs.  

FutureCommit is designed to not only **optimize developer workflows** but also provide organizations with a **scalable, AI-powered adoption model** to ensure smoother project execution and collaboration.  

