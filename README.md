# Client Portal

A full-stack application with React frontend and Flask backend, integrated with Supabase and Calendly.

## Prerequisites

- **Node.js** (v18 or higher)
  - Download and install from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **Python** (v3.8 or higher)
  - Download and install from [python.org](https://www.python.org/downloads/)
  - Verify installation: `python3 --version`

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd Client-Portal
```

### 2. Install Node.js dependencies
```bash
npm install
```

### 3. Create Python virtual environment
```bash
python3 -m venv myenv
```

### 4. Activate virtual environment
```bash
# On macOS/Linux:
source myenv/bin/activate

# On Windows:
myenv\Scripts\activate
```

### 5. Install Python dependencies
```bash
cd backend
pip install flask flask-cors python-dotenv supabase
cd ..
```

## Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
source ../myenv/bin/activate  # On Windows: ..\myenv\Scripts\activate
python app.py
```
Backend runs on: `http://localhost:5001`

### Start Frontend (Terminal 2)
```bash
npm run dev:client
```
Frontend runs on: `http://localhost:5000` (or next available port)

## Environment Variables

Create a `.env` file in the `backend` directory with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CALENDLY_API_KEY=your_calendly_api_key
CALENDLY_USERNAME=your_calendly_username
CALENDLY_EVENT_TYPE_UUID=your_event_type_uuid
```

Create a `.env` file in the `client` directory with:
```
VITE_API_BASE_URL=http://localhost:5001/api
```

## Project Structure

```
Client-Portal/
├── backend/          # Flask backend
│   ├── app.py        # Main application
│   ├── routes/       # API routes
│   └── .env          # Backend environment variables
├── client/           # React frontend
│   ├── src/          # Source files
│   └── .env          # Frontend environment variables
└── myenv/            # Python virtual environment (created after setup)
```

