import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import SurveyPage from "@/pages/survey";
import DashboardPage from "@/pages/dashboard";
import CheckEmailPage from "@/pages/check-email";
import EmailConfirmationPage from "@/pages/email-confirmation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/survey" component={SurveyPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/check-email" component={CheckEmailPage} />
      <Route path="/email-confirmation" component={EmailConfirmationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
