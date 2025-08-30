# FutureCommit  

**Commit to your growth, not just your code.**  

---

## 👥 Team  
- **Team Name**: CodeLatte  
- **Members**:  
  - Sneha Jain  
  - Siddhartha Chakrabarty
 
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

---

## Our Solution  

<img width="1195" height="669" alt="image" src="https://github.com/user-attachments/assets/385d41fe-580e-4645-8835-de760027838a" />


FutureCommit provides an AI-driven ecosystem that simplifies collaboration, documentation, and onboarding across projects. By leveraging **LangGraph pipelines** and seamless tool integrations, it addresses the key challenges faced by developers.  

| Feature                     | Description |
|------------------------------|-------------|
| **Automated Repo Analysis** | Auto-generates missing descriptions or README files using the LangGraph pipeline, ensuring repositories are always well-documented. |
| **AI-powered Onboarding**  | Analyzes the repository and creates structured onboarding documents that are automatically appended to READMEs for new contributors. |
| **AI-based Release Notes** | Generates concise and consistent release notes using LangGraph and appends them to the README for easy reference. |
| **Seamless Collaboration** | Shares Google Meet links, onboarding docs, and release notes via Google Drive and Slack, streamlining team communication. |
| **Project Updates**        | Publishes project updates directly to LinkedIn using LangGraph pipelines and the LinkedIn Outbound App, enhancing project visibility. |
| **Learning Resources**     | Curates and suggests tech stack resources in the form of playlists and collections, ensuring developers have everything they need in one place. |

---

**FutureCommit ensures projects remain structured, transparent, and collaborative — reducing friction for developers and maximizing productivity.**  


---

## User Onboarding & GitHub Analysis  

<img width="1195" height="670" alt="image" src="https://github.com/user-attachments/assets/b0b11fce-f88f-4c67-b9b7-9c6a46158c46" />

FutureCommit ensures a smooth and secure onboarding experience for users while integrating with GitHub for repository analysis. The process combines **Descope authentication**, **MongoDB storage**, and **LangGraph pipelines** to deliver automated insights.  

| Step                          | Description |
|-------------------------------|-------------|
| **User Authentication**     | Users sign up or sign in via **Descope**, ensuring secure and seamless authentication. |
| **Data Storage**            | User details (Email ID & GitHub username) are securely stored in **MongoDB** for easy reference and analysis. |
| **GitHub Integration**      | Using the **Descope GitHub Outbound App**, FutureCommit connects user accounts with GitHub repositories. |
| **Repo Analysis**           | Once connected, repositories are analyzed by **LangGraph pipelines**, enabling auto-generation of README files, onboarding docs, and release notes. |

---

This flow ensures **secure onboarding, persistent user identity, and intelligent repo insights**, forming the backbone of FutureCommit’s automation pipeline.  

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

## Technology Stack  

| Layer / Component       | Technology / Tool |
|--------------------------|-------------------|
| **Authentication**       | Descope (Signup/Signin Auth Flow) |
| **Backend Framework**    | Flask (for integration handling) |
| **Database**             | MongoDB (storing user GitHub & email IDs) |
| **AI / Analysis**        | LangGraph (for generating READMEs, onboarding docs, release notes, blogs) |
| **Visualization**        | Recharts (commit history & insights visualization) |
| **Collaboration**        | Slack Outbound App, Google Meet Outbound App |
| **Knowledge Curation**   | YouTube Outbound App, Google Drive Outbound App, Google Outbound App |
| **Social Integration**   | LinkedIn Outbound App |
| **Version Control**      | GitHub (integration via Descope GitHub Outbound App) |
| **Programming Language** | JavaScript & Python |
| **API Communication**    | REST APIs|
| **Security**             | Descope (OAuth, secure auth flow) |
| **Logging & Monitoring** | Integrated via backend + cloud provider logs |

---

This stack ensures **secure authentication, smooth integrations, automated documentation, and centralized collaboration**, making FutureCommit scalable and developer-friendly.

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

