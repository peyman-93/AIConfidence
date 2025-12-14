// Use environment variable or default to network IP for Mac compatibility
// For network access, set VITE_API_BASE_URL=http://192.168.50.145:5001/api in .env file
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.50.145:5001/api';
