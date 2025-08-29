# MCPHackathon

AI powered platform for Github repository collaboration

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd MCPHackathon
    ```

2.  **Backend Setup:**

    *   Navigate to the `backend` directory:

        ```bash
        cd backend
        ```

    *   Create a `.env` file based on the example (no example provided, keys are required).  Add the following environment variables:

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
        pip install -r requirements.txt  #Assumes requirements.txt exist with dependencies
        ```
        If `requirements.txt` does not exist, install the following dependencies:
        ```bash
        pip install flask flask-cors python-dotenv google-generativeai pymongo requests
        ```

3.  **Frontend Setup:**

    *   Navigate to the `frontend` directory:

        ```bash
        cd ../frontend
        ```

    *   Install the required Node.js packages:

        ```bash
        npm install
        ```

## Usage/Examples

1.  **Backend:**

    *   Run the Flask application:

        ```bash
        cd ../backend
        python app.py
        ```

        This will start the backend server.  The default port is not specified, but often defaults to port 5000.

2.  **Frontend:**

    *   Start the Vite development server:

        ```bash
        cd ../frontend
        npm run dev
        ```

        This will start the frontend development server, typically on port 5173.

3.  **Accessing the Application:**

    *   Open your web browser and go to the address provided by the Vite development server (usually `http://localhost:5173`).

4.  **Routes:**
    The frontend application defines the following routes:
    *   `/`: Home page (likely a landing page).
    *   `/github-details`: Github Details page
    *   `/repo/:repoName/*`:  Base route for all repo information.  `repoName` is a variable for the repository name.

        *   `/repo/:repoName/overview`: Repository overview.
        *   `/repo/:repoName/commits`: Repository commits.
        *   `/repo/:repoName/meet`: Repository collaborators and meeting scheduling.
        *   `/repo/:repoName/recommendations`: Repository recommendations.
        *   `/repo/:repoName/linkedin`: Repository LinkedIn project information.

## Contributing

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Implement your changes and write tests (if applicable).
4.  Commit your changes with descriptive commit messages.
5.  Push your branch to your forked repository.
6.  Create a pull request to the main repository.

## License

MIT License (Suggesting as license type is not mentioned in code provided)

---

## Release notes

Auto-generated release notes document: [View release notes](https://docs.google.com/document/d/1x4HqILOPTzIUB-ON9VzlDz_-nYi_3OcuLdMm7MkMyA4/edit)
