import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "@/lib/mock-data";
import { surveyAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface SurveyFormData {
  // Section 1: Personal Information
  full_name: string;
  email: string;
  age_range: string;
  country: string;
  linkedin_profile: string;
  
  // Section 2: Background
  best_describes_you: string;
  industry: string;
  job_role: string;
  years_experience: string;
  how_did_you_hear: string;
  referral_name: string; // Only shown if "Referral" is selected
}

const AGE_RANGES = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+"
];

const BEST_DESCRIBES_OPTIONS = [
  "Entrepreneur",
  "Executive/Leader",
  "Professional/Manager",
  "Student",
  "Other"
];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Consulting",
  "Real Estate",
  "Retail",
  "Manufacturing",
  "Non-profit",
  "Other"
];

const HOW_DID_YOU_HEAR_OPTIONS = [
  "Social Media",
  "Google Search",
  "Referral",
  "Podcast",
  "YouTube",
  "LinkedIn",
  "Other"
];

export default function SurveyPage() {
  const { user, loading, completeSurvey } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_, setLocation] = useLocation();

  const form = useForm<SurveyFormData>({
    defaultValues: {
      full_name: "",
      email: user?.email || "",
      age_range: "",
      country: "",
      linkedin_profile: "",
      best_describes_you: "",
      industry: "",
      job_role: "",
      years_experience: "",
      how_did_you_hear: "",
      referral_name: "",
    },
  });

  // Update email when user loads
  useEffect(() => {
    if (user?.email) {
      form.setValue("email", user.email);
    }
  }, [user?.email, form]);

  // Wait for auth to finish loading before checking user
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;
  const howDidYouHear = form.watch("how_did_you_hear");

  const handleNext = async () => {
    if (step < totalSteps) {
      // Validate current step
      if (step === 1) {
        const errors: string[] = [];
        const data = form.getValues();
        
        if (!data.full_name?.trim()) errors.push("Full Name is required");
        if (!data.email?.trim()) errors.push("Email Address is required");
        if (!data.age_range) errors.push("Age Range is required");
        if (!data.country?.trim()) errors.push("Country / Location is required");
        
        if (errors.length > 0) {
          toast.error(errors[0]);
          return;
        }
      }
      setStep(step + 1);
    } else {
      // Submit survey
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Validate step 2
    const errors: string[] = [];
    const data = form.getValues();
    
    if (!data.best_describes_you) errors.push("Please select what best describes you");
    if (!data.industry) errors.push("Please select your industry");
    if (!data.job_role?.trim()) errors.push("Current role is required");
    if (!data.years_experience) errors.push("Years of professional experience is required");
    if (!data.how_did_you_hear) errors.push("Please select how you heard about us");
    if (data.how_did_you_hear === "Referral" && !data.referral_name?.trim()) {
      errors.push("Please provide the name of the person who referred you");
    }
    
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      await surveyAPI.submit({
        full_name: data.full_name,
        email: data.email,
        age_range: data.age_range,
        country: data.country,
        linkedin_profile: data.linkedin_profile || null,
        best_describes_you: data.best_describes_you,
        industry: data.industry,
        job_role: data.job_role,
        years_experience: data.years_experience,
        how_did_you_hear: data.how_did_you_hear,
        referral_name: data.how_did_you_hear === "Referral" ? data.referral_name : null,
      });

      toast.success("Survey submitted successfully!");
      completeSurvey();
      setLocation("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit survey. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif text-primary">Onboarding Assessment</h1>
          <p className="text-muted-foreground">Help us tailor your coaching experience.</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Progress</span>
            <span>Section {step} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 1 && "Personal Information"}
              {step === 2 && "Background"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Tell us about yourself"}
              {step === 2 && "Help us understand your professional background"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    {...form.register("full_name", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...form.register("email", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Age Range <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="age_range"
                    control={form.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age range..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_RANGES.map((range) => (
                            <SelectItem key={range} value={range}>
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country / Location <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="country"
                    placeholder="United States"
                    {...form.register("country", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_profile">
                    LinkedIn Profile
                  </Label>
                  <Input
                    id="linkedin_profile"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    {...form.register("linkedin_profile")}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>
                    What best describes you? <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="best_describes_you"
                    control={form.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                        {BEST_DESCRIBES_OPTIONS.map((option, index) => (
                          <div key={option} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`desc-${index}`} />
                            <Label htmlFor={`desc-${index}`} className="font-normal cursor-pointer">
                              {index + 1}. {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    What industry do you work in? <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="industry"
                    control={form.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                        {INDUSTRIES.map((industry, index) => (
                          <div key={industry} className="flex items-center space-x-2">
                            <RadioGroupItem value={industry} id={`industry-${index}`} />
                            <Label htmlFor={`industry-${index}`} className="font-normal cursor-pointer">
                              {index + 1}. {industry}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_role">
                    What is your current role? <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="job_role"
                    placeholder="e.g., Software Engineer, Marketing Manager"
                    {...form.register("job_role", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Years of professional experience? <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="years_experience"
                    control={form.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select years of experience..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1">0-1 years</SelectItem>
                          <SelectItem value="2-5">2-5 years</SelectItem>
                          <SelectItem value="6-10">6-10 years</SelectItem>
                          <SelectItem value="11-15">11-15 years</SelectItem>
                          <SelectItem value="16-20">16-20 years</SelectItem>
                          <SelectItem value="20+">20+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    How did you hear about us? <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="how_did_you_hear"
                    control={form.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {HOW_DID_YOU_HEAR_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {howDidYouHear === "Referral" && (
                    <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="referral_name">
                        Other: <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="referral_name"
                        placeholder="Name of person who referred you"
                        {...form.register("referral_name", { 
                          required: howDidYouHear === "Referral" 
                        })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

          </CardContent>
          <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
            <Button variant="ghost" disabled={step === 1 || isSubmitting} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button onClick={handleNext} className="w-32" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : step === totalSteps ? "Finish" : "Next"} 
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
