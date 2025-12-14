from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend directory
backend_dir = Path(__file__).parent
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)
# Allow CORS from localhost and common network IPs
CORS(app, origins=[
    "http://localhost:5173", 
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5173",
    # Allow requests from any origin in development (you can restrict this in production)
    "*"
])

# Register blueprints
from routes.auth import auth_bp
from routes.surveys import surveys_bp
from routes.bookings import bookings_bp
from routes.webhooks import webhooks_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(surveys_bp, url_prefix='/api/surveys')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'ok'}, 200

if __name__ == '__main__':
    # Run on all interfaces (0.0.0.0) to allow network access
    app.run(debug=True, host='0.0.0.0', port=5001)
