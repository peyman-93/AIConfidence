import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { authAPI } from "@/lib/api";
import { toast } from "sonner";

export default function CheckEmailPage() {
  const [_, setLocation] = useLocation();
  const [email, setEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Get email from sessionStorage
    const pendingEmail = sessionStorage.getItem("pending_email");
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email address not found");
      return;
    }

    setIsResending(true);
    setResendSuccess(false);
    try {
      await authAPI.resendConfirmation(email);
      setResendSuccess(true);
      toast.success("Confirmation email sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend confirmation email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a confirmation link to {email ? <strong className="text-foreground">{email}</strong> : "your email address"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Please check your inbox and click on the confirmation link to activate your account.</p>
            <p className="font-medium text-foreground">Didn't receive the email?</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check your spam/junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>
          
          {resendSuccess && (
            <Alert>
              <AlertDescription>
                Confirmation email sent! Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={handleResend} 
              variant="outline" 
              className="w-full"
              disabled={isResending || !email}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Confirmation Email"
              )}
            </Button>
            <Button onClick={() => setLocation("/")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

