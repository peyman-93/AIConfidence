import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authAPI, getToken, clearTokens } from "./api";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  hasCompletedSurvey: boolean;
}

export interface ClientFile {
  id: string;
  name: string;
  date: string;
  size: string;
  type: "pdf" | "image" | "doc";
}

// Mock Data (for files - can be replaced with API later)
export const MOCK_FILES: ClientFile[] = [
  { id: "1", name: "Initial_Assessment_Report.pdf", date: "2024-10-15", size: "2.4 MB", type: "pdf" },
  { id: "2", name: "Goal_Setting_Worksheet.docx", date: "2024-10-20", size: "1.1 MB", type: "doc" },
  { id: "3", name: "Session_Notes_Nov_2024.pdf", date: "2024-11-05", size: "850 KB", type: "pdf" },
  { id: "4", name: "Nutrition_Plan_v1.pdf", date: "2024-11-12", size: "3.2 MB", type: "pdf" },
];

// Auth Hook (Real API)
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [_, setLocation] = useLocation();

  // Check for existing token and fetch user on mount
  // Only run once on mount to avoid race conditions during login
  useEffect(() => {
    // If user is already set, just mark loading as complete
    if (user) {
      setLoading(false);
      return;
    }
    
    const token = getToken();
    if (token) {
      // Try to fetch current user
      authAPI
        .getCurrentUser()
        .then((response) => {
          const userData = response.user;
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.full_name,
            hasCompletedSurvey: userData.survey_completed,
          });
        })
        .catch(() => {
          // Token invalid, clear it
          clearTokens();
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []); // Only run once on mount

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      
      // Small delay to ensure tokens are stored
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch user profile - if this fails, use data from login response
      let userData;
      try {
        const userResponse = await authAPI.getCurrentUser();
        userData = userResponse.user;
        console.log("User profile fetched successfully:", userData);
      } catch (profileError: any) {
        // If profile fetch fails, create user from login response
        console.warn("Failed to fetch user profile, using login data:", profileError);
        userData = {
          id: response.user_id,
          email: response.email || email,
          full_name: email.split('@')[0],
          survey_completed: false,
        };
      }
      
      const newUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        hasCompletedSurvey: userData.survey_completed || false,
      };
      
      console.log("Setting user and navigating:", newUser);
      setUser(newUser);
      setLoading(false); // Mark loading as complete
      
      // Navigate immediately after setting user
      // Use a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (newUser.hasCompletedSurvey) {
        console.log("Navigating to dashboard");
        setLocation("/dashboard");
      } else {
        console.log("Navigating to survey");
        setLocation("/survey");
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (email: string, password: string, name: string, promoterCode?: string) => {
    try {
      const response = await authAPI.register({
        email,
        password,
        full_name: name,
        promoter_code: promoterCode,
      });
      
      // If email confirmation is required, redirect to check-email page
      if (response.requires_email_confirmation) {
        // Store email temporarily to show on check-email page
        sessionStorage.setItem("pending_email", email);
        setLocation("/check-email");
        return { 
          success: true, // Success in registration, but needs confirmation
          requiresConfirmation: true
        };
      }
      
      // If we got tokens, fetch user profile and complete registration
      if (response.access_token && response.refresh_token) {
        // Wait a moment for Supabase to process the registration
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          const userResponse = await authAPI.getCurrentUser();
          const userData = userResponse.user;
          
          const newUser: User = {
            id: userData.id,
            email: userData.email,
            name: userData.full_name,
            hasCompletedSurvey: userData.survey_completed,
          };
          
          setUser(newUser);
          
          if (newUser.hasCompletedSurvey) {
            setLocation("/dashboard");
          } else {
            setLocation("/survey");
          }
          
          return { success: true };
        } catch (userError: any) {
          // If getting user fails (401), the token might not be valid yet
          // Try login as fallback
          console.warn("Failed to get user after registration, trying login:", userError);
          // Clear the invalid tokens first
          clearTokens();
          return await login(email, password);
        }
      }
      
      // If no tokens, try to login (fallback)
      return await login(email, password);
    } catch (error: any) {
      // Check if it's an email confirmation error
      if (error.message && error.message.includes("email")) {
        return { 
          success: false, 
          error: "Please check your email to confirm your account before logging in." 
        };
      }
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Even if API call fails, clear local state
      console.error("Logout error:", error);
    } finally {
      clearTokens();
      setUser(null);
      setLocation("/");
    }
  };

  const completeSurvey = () => {
    // This will be called after survey submission
    // The user state will be updated when we refetch or navigate
    if (user) {
      const updatedUser = { ...user, hasCompletedSurvey: true };
      setUser(updatedUser);
      setLocation("/dashboard");
    }
  };

  return { user, loading, login, register, logout, completeSurvey };
}
