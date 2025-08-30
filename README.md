# 🚀 FutureCommit  

**Commit to your growth, not just your code.**  

---

## 🎯 Hackathon Theme / Challenge Addressed  
**Theme 1: Build a purposeful AI agent**  

---

## 📌 Project Name & Short Description  
**FutureCommit** is an AI-powered developer productivity platform that integrates with GitHub, Slack, Google Workspace, YouTube, and LinkedIn to help developers:  

- Automate repo onboarding docs.  
- Generate missing descriptions/readmes.  
- Analyze commit history & auto-generate release notes.  
- Share updates across Slack, LinkedIn, and Drive.  
- Recommend learning resources (YouTube playlists, blogs).  
- Streamline collaboration with auto-generated Google Meet links.  

Powered by **Descope authentication**, **LangGraph AI pipelines**, and **MongoDB for storage**.  

---

## 👥 Team  
- **Team Name**: CodeLatte  
- **Members**:  
  - Sneha Jain  
  - Siddhartha Chakrabarty

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
