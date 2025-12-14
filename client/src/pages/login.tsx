import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, User, ArrowRight, AlertCircle } from "lucide-react";
import heroBg from "@assets/generated_images/elegant_professional_background_with_navy_and_gold_tones.png";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  promoterCode: z.string().optional(),
});

export default function LoginPage() {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    setLoginError(null);
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (!result.success) {
        const errorMsg = result.error || "Login failed";
        setLoginError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        
        // If error suggests email not confirmed, offer to resend
        if (errorMsg.toLowerCase().includes("email") || errorMsg.toLowerCase().includes("confirm")) {
          // Could add a "Resend confirmation" link here
        }
      } else {
        toast.success("Login successful! Redirecting...");
        // The redirect is handled in the login function
        // Keep loading state during redirect - it will reset when component unmounts
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      setLoginError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const onRegister = async (data: z.infer<typeof registerSchema>) => {
    setRegisterError(null);
    setIsLoading(true);
    try {
      const result = await register(
        data.email,
        data.password,
        data.name,
        data.promoterCode
      );
      if (!result.success && !result.requiresConfirmation) {
        setRegisterError(result.error || "Registration failed");
        toast.error(result.error || "Registration failed");
      } else if (result.requiresConfirmation) {
        // Will redirect to check-email page, no error needed
        toast.success("Registration successful! Please check your email.");
      } else {
        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      setRegisterError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-serif font-bold text-primary tracking-tight">Ascend Coaching</h1>
            <p className="text-muted-foreground">Welcome to your personal growth portal</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" className="pl-10" placeholder="you@example.com" {...loginForm.register("email")} />
                  </div>
                  {loginForm.formState.errors.email && <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" className="pl-10" {...loginForm.register("password")} />
                  </div>
                  {loginForm.formState.errors.password && <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>}
                </div>
                
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              {registerError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-name" className="pl-10" placeholder="John Doe" {...registerForm.register("name")} />
                  </div>
                  {registerForm.formState.errors.name && <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-email" className="pl-10" placeholder="you@example.com" {...registerForm.register("email")} />
                  </div>
                  {registerForm.formState.errors.email && <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-password" type="password" className="pl-10" {...registerForm.register("password")} />
                  </div>
                  {registerForm.formState.errors.password && <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoter">Promoter Code (Optional)</Label>
                  <Input id="promoter" placeholder="e.g. SUMMER2025" {...registerForm.register("promoterCode")} />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right: Image */}
      <div className="hidden lg:block relative overflow-hidden bg-primary/10">
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] z-10"></div>
        <img 
          src={heroBg} 
          alt="Abstract Professional Background" 
          className="w-full h-full object-cover animate-in fade-in duration-1000"
        />
        <div className="absolute bottom-12 left-12 right-12 z-20 text-white">
          <blockquote className="font-serif text-3xl italic leading-relaxed mb-4">
            "The only way to do great work is to love what you do."
          </blockquote>
          <cite className="not-italic text-white/80 font-sans">— Steve Jobs</cite>
        </div>
      </div>
    </div>
  );
}
