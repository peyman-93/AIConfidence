import { useState } from "react";
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
import { CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface SurveyFormData {
  goals: string;
  goalsDetails: string;
  challenges: string;
  commitmentLevel: string;
}

export default function SurveyPage() {
  const { user, loading, completeSurvey } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_, setLocation] = useLocation();

  const form = useForm<SurveyFormData>({
    defaultValues: {
      goals: "",
      goalsDetails: "",
      challenges: "",
      commitmentLevel: "10",
    },
  });

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

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = async () => {
    if (step < totalSteps) {
      // Validate current step
      if (step === 1) {
        const goals = form.getValues("goals");
        if (!goals) {
          toast.error("Please select a main objective");
          return;
        }
      } else if (step === 2) {
        const challenges = form.getValues("challenges");
        if (!challenges || challenges.trim().length === 0) {
          toast.error("Please describe your biggest challenge");
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
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const goalsText = `${data.goals}${data.goalsDetails ? `: ${data.goalsDetails}` : ""}`;
      
      await surveyAPI.submit({
        goals: goalsText,
        challenges: data.challenges,
        experience_level: data.commitmentLevel,
        additional_notes: `Commitment Level: ${data.commitmentLevel}/10`,
      });

      toast.success("Survey submitted successfully!");
      completeSurvey();
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
            <span>Step {step} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 1 && "Your Primary Goals"}
              {step === 2 && "Current Challenges"}
              {step === 3 && "Commitment Level"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "What do you hope to achieve in the next 3 months?"}
              {step === 2 && "What is the biggest obstacle standing in your way?"}
              {step === 3 && "Are you ready to make a change?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>Main Objective</Label>
                  <Controller
                    name="goals"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a goal..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="career">Career Advancement</SelectItem>
                          <SelectItem value="health">Health & Wellness</SelectItem>
                          <SelectItem value="business">Business Growth</SelectItem>
                          <SelectItem value="relationships">Relationships</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specific Details</Label>
                  <Textarea 
                    placeholder="Describe your goal in more detail..." 
                    className="min-h-[100px]"
                    {...form.register("goalsDetails")}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>Describe your biggest challenge</Label>
                  <Textarea 
                    placeholder="What's holding you back?" 
                    className="min-h-[150px]"
                    {...form.register("challenges", { required: true })}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <Label>How committed are you on a scale of 1-10?</Label>
                <Controller
                  name="commitmentLevel"
                  control={form.control}
                  render={({ field }) => (
                    <RadioGroup 
                      value={field.value} 
                      onValueChange={field.onChange}
                      className="grid grid-cols-5 gap-4"
                    >
                      {[2, 4, 6, 8, 10].map((val) => (
                        <div key={val} className="flex flex-col items-center space-y-2">
                          <RadioGroupItem value={val.toString()} id={`r-${val}`} className="peer sr-only" />
                          <Label
                            htmlFor={`r-${val}`}
                            className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer w-full text-center transition-all"
                          >
                            <span className="text-xl font-bold">{val}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />
                <p className="text-sm text-muted-foreground text-center pt-4">
                  "I am ready to do whatever it takes."
                </p>
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
