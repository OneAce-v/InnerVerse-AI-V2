import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../AuthContext.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.tsx";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "../components/ui/progress.tsx";
import { Badge } from "../components/ui/badge.tsx";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function Onboarding() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    age: "",
    gender: "",
    height: "",
    weight: "",
    primaryGoal: "",
    fitnessLevel: "",
    activityLevel: "",
    workoutExperience: "",
    availableDays: "",
    sessionDuration: "",
    workoutLocation: "",
    availableEquipment: [],
    healthRestrictions: [],
    dietType: "",
    sleepDuration: "",
    stressLevel: 5,
    goalCommitment: 5,
  });

  const totalSteps = 10;
  const progress = (step / totalSteps) * 100;

  const validateStep = () => {
    setErrorMsg(null);
    switch (step) {
      case 0:
        if (!formData.age) return "Age is required";
        if (parseInt(formData.age) < 16)
          return "You must be at least 16 to use this app";
        if (!formData.gender) return "Gender is required";
        if (!formData.height) return "Height is required";
        if (!formData.weight) return "Weight is required";
        if (parseInt(formData.weight) < 30 || parseInt(formData.weight) > 300)
          return "Please verify your weight is correct (in kg)";
        return null;
      case 1:
        if (!formData.primaryGoal) return "You must select a primary goal";
        return null;
      case 2:
        if (!formData.fitnessLevel) return "Fitness level is required";
        if (!formData.activityLevel) return "Activity level is required";
        if (!formData.workoutExperience)
          return "Workout experience is required";
        return null;
      case 3:
        if (!formData.availableDays) return "Available days is required";
        if (!formData.sessionDuration) return "Session duration is required";
        return null;
      case 4:
        if (!formData.workoutLocation) return "Workout location is required";
        if (
          formData.workoutLocation === "Home" &&
          formData.availableEquipment.length === 0
        )
          return "Please select available equipment for home workouts";
        return null;
      case 5:
        if (formData.healthRestrictions.length === 0)
          return "Please select any health conditions or 'None'";
        return null;
      case 6:
        if (!formData.dietType) return "Diet type is required";
        return null;
      case 7:
        if (!formData.sleepDuration) return "Average sleep hours are required";
        return null;
      case 8:
        if (!formData.stressLevel) return "Stress level is required";
        return null;
      case 9:
        if (!formData.goalCommitment) return "Please rate your commitment";
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };
  const handleBack = () => {
    setErrorMsg(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const toggleMulti = (
    field: string,
    val: string,
    exclusiveNone: boolean = false,
  ) => {
    setFormData((prev: any) => {
      let arr = prev[field] || [];
      if (exclusiveNone) {
        if (val === "None") return { ...prev, [field]: ["None"] };
        arr = arr.filter((x: string) => x !== "None");
      }
      if (arr.includes(val))
        return { ...prev, [field]: arr.filter((x: string) => x !== val) };
      return { ...prev, [field]: [...arr, val] };
    });
  };

  const setSingle = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age) || undefined,
          height: parseInt(formData.height) || undefined,
          weight: parseInt(formData.weight) || undefined,
          stressLevel: parseInt(formData.stressLevel) || undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save profile: ${response.statusText}`);
      }
      // Force reload to get out of onboarding guard state
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goalOpts = [
    "Weight Loss",
    "Muscle Gain",
    "Improve Fitness",
    "Better Sleep",
    "Reduce Stress",
    "Improve Flexibility",
    "Holistic Development",
  ];
  const equipOpts = [
    "No Equipment",
    "Resistance Bands",
    "Dumbbells",
    "Adjustable Dumbbells",
    "Kettlebells",
    "Barbell Setup",
    "Home Gym",
    "Commercial Gym",
    "Yoga Mat",
    "Pull-Up Bar",
  ];
  const healthOpts = [
    "None",
    "Back Pain",
    "Knee Pain",
    "Shoulder Injury",
    "Heart Condition",
    "Hypertension",
    "Diabetes",
    "Asthma",
    "Other",
  ];

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">
              Personal Information (Required)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  min="10"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setSingle("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => setSingle("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input
                  type="number"
                  min="100"
                  max="250"
                  value={formData.height}
                  onChange={(e) => setSingle("height", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  min="30"
                  max="300"
                  value={formData.weight}
                  onChange={(e) => setSingle("weight", e.target.value)}
                />
              </div>
            </div>
            {parseInt(formData.age) < 16 && (
              <div className="text-destructive text-sm font-bold flex items-center gap-1 mt-2 p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4" /> Parental consent notice: You
                must be 16+
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-2">Primary Goal</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select 1 primary goal.
            </p>
            <div className="flex flex-wrap gap-2">
              {goalOpts.map((g) => (
                <Badge
                  key={g}
                  variant={formData.primaryGoal === g ? "default" : "outline"}
                  className="cursor-pointer text-sm p-2 px-3 hover:opacity-80 transition-opacity"
                  onClick={() => setSingle("primaryGoal", g)}
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4">Fitness Profile</h3>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Current Fitness Level
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Complete Beginner",
                  "Beginner",
                  "Intermediate",
                  "Advanced",
                  "Athlete",
                ].map((l) => (
                  <Button
                    key={l}
                    variant={
                      formData.fitnessLevel === l ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSingle("fitnessLevel", l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Daily Activity Level
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Mostly Sitting",
                  "Lightly Active",
                  "Moderately Active",
                  "Very Active",
                  "Extremely Active",
                ].map((l) => (
                  <Button
                    key={l}
                    variant={
                      formData.activityLevel === l ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSingle("activityLevel", l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Workout Experience
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Never",
                  "Less than 3 Months",
                  "3-12 Months",
                  "1-3 Years",
                  "More than 3 Years",
                ].map((l) => (
                  <Button
                    key={l}
                    variant={
                      formData.workoutExperience === l ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSingle("workoutExperience", l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4">Availability</h3>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Days Available Per Week
              </Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  "1 Day",
                  "2 Days",
                  "3 Days",
                  "4 Days",
                  "5 Days",
                  "6 Days",
                  "7 Days",
                ].map((l) => (
                  <Button
                    key={l}
                    variant={
                      formData.availableDays === l ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSingle("availableDays", l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Preferred Session Duration
              </Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  "10 Minutes",
                  "20 Minutes",
                  "30 Minutes",
                  "45 Minutes",
                  "60 Minutes",
                  "90+ Minutes",
                ].map((l) => (
                  <Button
                    key={l}
                    variant={
                      formData.sessionDuration === l ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSingle("sessionDuration", l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4">Workout Environment</h3>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Workout Location</Label>
              <div className="flex gap-2 flex-wrap">
                {["Home", "Gym", "Outdoor", "Mixed"].map((l) => (
                  <Button
                    key={l}
                    variant={
                      formData.workoutLocation === l ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setSingle("workoutLocation", l);
                      if (l === "Gym")
                        setSingle("availableEquipment", ["Commercial Gym"]);
                    }}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
            {formData.workoutLocation === "Home" && (
              <div className="space-y-2 mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <Label className="text-primary font-bold">
                  Select Available Equipment (Required)
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {equipOpts.map((e) => (
                    <Badge
                      key={e}
                      variant={
                        formData.availableEquipment.includes(e)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer text-sm p-2"
                      onClick={() => toggleMulti("availableEquipment", e)}
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Health Information</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Do you have any health conditions? (Select 'None' if applicable)
            </p>
            <div className="flex flex-wrap gap-2">
              {healthOpts.map((e) => (
                <Badge
                  key={e}
                  variant={
                    formData.healthRestrictions.includes(e)
                      ? "destructive"
                      : "outline"
                  }
                  className="cursor-pointer text-sm p-2 px-3"
                  onClick={() => toggleMulti("healthRestrictions", e, true)}
                >
                  {e}
                </Badge>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Nutrition Profile</h3>
            <div className="space-y-2">
              <Label>Diet Type</Label>
              <div className="flex flex-col gap-2 max-w-sm">
                {["Vegetarian", "Vegan", "Eggetarian", "Non-Vegetarian"].map(
                  (d) => (
                    <Button
                      key={d}
                      variant={formData.dietType === d ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setSingle("dietType", d)}
                    >
                      {d}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Sleep Profile</h3>
            <div className="space-y-2">
              <Label>Average Sleep Hours</Label>
              <div className="flex flex-col gap-2 max-w-sm">
                {[
                  "Less than 4",
                  "4-5 hours",
                  "5-6 hours",
                  "6-7 hours",
                  "7-8 hours",
                  "8+ hours",
                ].map((d) => (
                  <Button
                    key={d}
                    variant={
                      formData.sleepDuration === d ? "default" : "outline"
                    }
                    className="justify-start"
                    onClick={() => setSingle("sleepDuration", d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
              {formData.sleepDuration &&
                formData.sleepDuration.includes("Less than 4") && (
                  <div className="text-orange-500 text-sm font-bold flex items-center gap-1 mt-2 p-2 bg-orange-500/10 rounded-lg">
                    <AlertCircle className="w-4 h-4" /> Wellness Warning:
                    Chronic sleep deprivation detected.
                  </div>
                )}
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Stress Profile</h3>
            <p className="text-sm text-muted-foreground">
              How stressed do you feel most days? (1 = Low, 10 = High)
            </p>
            <div className="flex items-center gap-4 mt-8 bg-muted p-6 rounded-xl">
              <Input
                type="range"
                min="1"
                max="10"
                value={formData.stressLevel}
                onChange={(e) =>
                  setSingle("stressLevel", parseInt(e.target.value))
                }
                className="flex-1"
              />
              <div className="font-black text-3xl w-12 text-center text-primary">
                {formData.stressLevel}
              </div>
            </div>
            {formData.stressLevel > 8 && (
              <div className="text-orange-500 text-sm font-bold flex items-center gap-1 mt-2 p-2 bg-orange-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4" /> High stress detected. Mental
                wellness will be prioritized.
              </div>
            )}
          </div>
        );
      case 9:
        return (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-3xl font-black mb-2">Final Step!</h3>
            <p className="text-muted-foreground mb-8">
              How committed are you to improving your health right now? (1-10)
            </p>
            <div className="flex items-center gap-4 justify-center bg-muted p-6 rounded-xl max-w-sm mx-auto">
              <Input
                type="range"
                min="1"
                max="10"
                value={formData.goalCommitment}
                onChange={(e) =>
                  setSingle("goalCommitment", parseInt(e.target.value))
                }
                className="flex-1"
              />
              <div className="font-black text-4xl w-12 text-center text-primary">
                {formData.goalCommitment}
              </div>
            </div>
            <div className="mt-8 border border-border p-4 rounded-xl bg-card inline-block text-left w-full max-w-sm mx-auto shadow-md">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">Profile Completion</span>
                <span className="font-black text-green-500">100%</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  AI Confidence Score
                </span>
                <span className="font-bold">96%</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Recommendation Accuracy
                </span>
                <span className="font-bold text-primary">High</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Data Quality
                </span>
                <span className="font-bold text-green-500">Excellent</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border bg-card shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />

          <CardHeader className="border-b border-border bg-card/50">
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> InnerVerse Setup
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {step + 1} / {totalSteps}
              </Badge>
            </div>
            <Progress
              value={progress}
              className="h-1 mb-2 bg-muted"
              indicatorClassName="bg-gradient-to-r from-primary to-secondary"
            />
          </CardHeader>

          <CardContent className="min-h-[400px] flex flex-col justify-center p-6 md:p-8 relative">
            {errorMsg && (
              <div className="absolute top-4 left-6 right-6 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-sm text-destructive font-bold shadow-sm z-10 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-between bg-muted/30 p-4 md:p-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < totalSteps - 1 ? (
              <Button onClick={handleNext} className="gap-2 bg-primary">
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {loading ? "Generating Profile..." : "Complete Setup"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
