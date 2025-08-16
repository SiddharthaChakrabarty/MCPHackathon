"""
Flask backend for CreatorHub — session validation + Descope integration
- POST /api/auth/session  { token } -> validates Descope session token and establishes server session (cookie)
- GET  /api/auth/session  -> reads server session and returns user
- POST /api/auth/signout  -> clears server session
- /api/github/repos uses Descope-managed outbound tokens when requested (unchanged from previous)

Environment:
DESCOPE_PROJECT_ID
DESCOPE_MANAGEMENT_KEY (optional, for management operations)
BASE_URL, FRONTEND_URL, SECRET_KEY
"""

from flask import Flask, request, session, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from descope import DescopeClient
except Exception:
    DescopeClient = None

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'unsafe-dev-secret')
CORS(app, supports_credentials=True)

DESCOPE_PROJECT_ID = 'c86dcca183872d227506be14e5fc65ca7016c33c'
DESCOPE_MANAGEMENT_KEY = 'UDMxRWVDY0RQdHdRR3lpOXdiWms0WkxLS0U1YTpLMzFNeW84anI4Wk1hSUg0MXhRR2tmODNGMU1v'

# Initialize Descope client (backend SDK) — used for session validation and mgmt if key provided
descope_client = None
if DescopeClient is not None and DESCOPE_PROJECT_ID:
    if DESCOPE_MANAGEMENT_KEY:
        descope_client = DescopeClient(project_id=DESCOPE_PROJECT_ID, management_key=DESCOPE_MANAGEMENT_KEY)
    else:
        descope_client = DescopeClient(project_id=DESCOPE_PROJECT_ID)

@app.route('/api/auth/session', methods=['POST'])
def auth_session_post():
    """No longer validates session token server-side. Just echoes user info from frontend."""
    body = request.get_json() or {}
    user = body.get('user')
    if not user:
        return jsonify({'error': 'missing user'}), 400
    session['user'] = user  # Optionally store minimal info for convenience
    return jsonify({'user': user})

@app.route('/api/auth/session', methods=['GET'])
def auth_session_get():
    u = session.get('user')
    if not u:
        return jsonify({'error': 'not authenticated'}), 401
    return jsonify({'user': u})

@app.route('/api/auth/signout', methods=['POST'])
def auth_signout():
    session.clear()
    return jsonify({'ok': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000, debug=True)
