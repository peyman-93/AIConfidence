import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { authAPI } from "@/lib/api";
import { toast } from "sonner";

export default function EmailConfirmationPage() {
  const [_, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [type, setType] = useState<string>("");

  useEffect(() => {
    // SECURITY: Immediately clear the URL to prevent token exposure
    // Supabase can send tokens in different ways:
    // 1. Query parameters: ?token=XXX&type=signup
    // 2. Hash fragment: #access_token=XXX&type=signup  
    // 3. Direct access_token in URL (INSECURE - we need to handle this)
    
    let tokenParam: string | null = null;
    let typeParam = "signup";
    
    // SECURITY: Check hash fragment first (more secure, doesn't show in URL bar after load)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      tokenParam = hashParams.get("access_token") || hashParams.get("token");
      typeParam = hashParams.get("type") || hashParams.get("token_type") || typeParam;
    }
    
    // Check query parameters (less secure but sometimes used)
    if (!tokenParam) {
      const params = new URLSearchParams(window.location.search);
      tokenParam = params.get("token") || params.get("access_token");
      typeParam = params.get("type") || typeParam;
    }
    
    // Also check for Supabase's token_hash format
    if (!tokenParam) {
      const params = new URLSearchParams(window.location.search);
      tokenParam = params.get("token_hash");
    }
    
    // Handle case where token might be in the path (e.g., /email-confirmation/access_token=XXX)
    // This should not happen, but we'll handle it for security
    if (!tokenParam && window.location.pathname.includes("access_token")) {
      const pathParts = window.location.pathname.split("access_token=");
      if (pathParts.length > 1) {
        tokenParam = pathParts[1].split("&")[0].split("#")[0];
      }
    }

    // SECURITY: Clear URL immediately after extracting token
    if (tokenParam) {
      // Clear the URL to prevent token exposure
      window.history.replaceState({}, document.title, "/email-confirmation");
      
      setToken(tokenParam);
      setType(typeParam);
      verifyEmail(tokenParam, typeParam);
    } else {
      setStatus("error");
      setErrorMessage("No confirmation token found in URL. Please check your email and click the confirmation link again.");
    }
  }, []);

  const verifyEmail = async (token: string, type: string) => {
    try {
      const response = await authAPI.verifyEmail(token, type);
      if (response.success) {
        setStatus("success");
        toast.success("Email confirmed successfully!");
        // If we got tokens, fetch user and redirect appropriately
        if (response.access_token) {
          // Wait a moment for tokens to be stored
          await new Promise(resolve => setTimeout(resolve, 200));
          
          try {
            const { authAPI } = await import("@/lib/api");
            const userResponse = await authAPI.getCurrentUser();
            const userData = userResponse.user;
            
            // Redirect based on survey completion
            if (userData.survey_completed) {
              setLocation("/dashboard");
            } else {
              setLocation("/survey");
            }
          } catch (userError) {
            // If we can't get user, just go to dashboard
            setLocation("/dashboard");
          }
        } else {
          // Redirect to login
          setTimeout(() => {
            setLocation("/");
          }, 2000);
        }
      } else {
        setStatus("error");
        setErrorMessage(response.error || "Failed to verify email");
      }
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "An error occurred while verifying your email");
    }
  };

  const resendConfirmation = async () => {
    // This would require the user's email, which we don't have here
    // For now, redirect to login where they can request resend
    setLocation("/?resend=true");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Verifying Email"}
            {status === "success" && "Email Confirmed!"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your email address..."}
            {status === "success" && "Your email has been successfully confirmed. Redirecting to login..."}
            {status === "error" && errorMessage}
          </CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setLocation("/")} className="w-full">
                Go to Login
              </Button>
              <Button variant="outline" onClick={resendConfirmation} className="w-full">
                Resend Confirmation Email
              </Button>
            </div>
          </CardContent>
        )}
        {status === "success" && (
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Continue to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

