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

<img width="1051" height="587" alt="image" src="https://github.com/user-attachments/assets/61cbc600-1a04-452e-881c-6df741a2188f" />

Developers face several challenges when working on collaborative projects:  

- **Wasted time** due to lack of proper descriptions & README files.  
- **Unstructured documentation** makes onboarding new members painful.  
- **Collaboration & communication issues** arise when juggling multiple tools.  
- **Commit history management** and reverting to older versions is tedious without proper release notes.  
- **Learning the tech stack** for a project is scattered across multiple platforms, slowing down productivity.  

FutureCommit addresses these issues by automating documentation, improving collaboration, and centralizing resources across platforms.

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

