import { API_BASE_URL } from "@/config";

// Token management
const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    promoter_code?: string;
  }) {
    const response = await apiRequest<{
      message: string;
      user_id: string;
      requires_email_confirmation?: boolean;
      access_token?: string;
      refresh_token?: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    // If tokens are provided (email confirmation disabled), store them
    if (response.access_token && response.refresh_token) {
      setToken(response.access_token);
      setRefreshToken(response.refresh_token);
    }
    
    return response;
  },

  async login(email: string, password: string) {
    const response = await apiRequest<{
      access_token: string;
      refresh_token: string;
      user_id: string;
      email: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    // Store tokens
    setToken(response.access_token);
    setRefreshToken(response.refresh_token);
    
    return response;
  },

  async getCurrentUser() {
    return apiRequest<{
      user: {
        id: string;
        email: string;
        full_name: string;
        survey_completed: boolean;
      };
    }>("/auth/me");
  },

  async verifyEmail(token: string, type: string = "signup") {
    const response = await apiRequest<{
      success: boolean;
      message?: string;
      access_token?: string;
      refresh_token?: string;
      user_id?: string;
      error?: string;
    }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token, type }),
    });
    
    // If tokens are provided, store them
    if (response.success && response.access_token && response.refresh_token) {
      setToken(response.access_token);
      setRefreshToken(response.refresh_token);
    }
    
    return response;
  },

  async resendConfirmation(email: string) {
    return apiRequest<{ message: string }>("/auth/resend-confirmation", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async logout() {
    clearTokens();
    return apiRequest("/auth/logout", {
      method: "POST",
    });
  },
};

// Survey API
export const surveyAPI = {
  async submit(data: {
    full_name?: string;
    email?: string;
    age_range?: string;
    country?: string;
    linkedin_profile?: string | null;
    best_describes_you?: string;
    industry?: string;
    job_role?: string;
    current_role?: string; // Legacy field name for backward compatibility
    years_experience?: string;
    how_did_you_hear?: string;
    referral_name?: string | null;
    // Legacy fields for backward compatibility
    goals?: string;
    challenges?: string;
    experience_level?: string;
    additional_notes?: string;
  }) {
    return apiRequest<{ message: string }>("/surveys/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getSurvey(userId: string) {
    return apiRequest(`/surveys/${userId}`);
  },
};

// Bookings API
export const bookingsAPI = {
  async getAvailability() {
    return apiRequest("/bookings/availability");
  },

  async getConfig() {
    return apiRequest<{
      calendly_username: string | null;
      calendly_event_type: string | null;
      error?: string;
    }>("/bookings/config");
  },

  async book(data: {
    calendly_event_id: string;
    scheduled_time: string;
  }) {
    return apiRequest<{
      message: string;
      booking_id: string;
    }>("/bookings/book", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getUserBookings() {
    return apiRequest<
      Array<{
        id: string;
        user_id: string;
        calendly_event_id: string;
        scheduled_time: string;
        status: string;
        created_at: string;
      }>
    >("/bookings");
  },
};

