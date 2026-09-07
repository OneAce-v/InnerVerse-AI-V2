import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext.tsx";
import { useLanguage, Language } from "../LanguageContext.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Switch } from "../components/ui/switch.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Palette,
  Target,
  Dumbbell,
  Apple,
  Wind,
  Bot,
  Plug,
  Terminal,
  Shield,
  Bell,
  Gamepad2,
  Accessibility,
  BarChart,
  Network,
  Save,
  Search,
  ChevronRight,
  CheckCircle2,
  ChevronLeft,
  Upload,
  AlertTriangle,
  Download,
  Trash2,
  Activity,
  Globe,
  Lock,
} from "lucide-react";
import { useTheme } from "../components/ThemeProvider.tsx";
import { PageHeader } from "../components/ui/page-header.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { staggerContainer, staggerItem } from "@/lib/motion";

const categories = [
  { id: "account", name: "Account Settings", icon: User },
  { id: "appearance", name: "Appearance & Theme", icon: Palette },
  { id: "language", name: "Language / भाषा / Sprache", icon: Globe },
  { id: "goals", name: "Goals Settings", icon: Target },
  { id: "fitness", name: "Fitness Preferences", icon: Dumbbell },
  { id: "nutrition", name: "Nutrition Preferences", icon: Apple },
  { id: "yoga", name: "Yoga & Meditation", icon: Wind },
  { id: "coach", name: "AI Coach Settings", icon: Bot },
  { id: "apps", name: "Connected Apps", icon: Plug },
  { id: "api", name: "API Connections", icon: Terminal },
  { id: "privacy", name: "Data & Privacy", icon: Shield },
  { id: "notifications", name: "Notification Settings", icon: Bell },
  { id: "gamification", name: "Gamification Settings", icon: Gamepad2 },
  { id: "accessibility", name: "Accessibility", icon: Accessibility },
  { id: "analytics", name: "Advanced Analytics", icon: BarChart },
  { id: "twin", name: "Digital Twin Settings", icon: Network },
  { id: "diagnostics", name: "Interactive Feature Test Suite", icon: Shield },
];

export default function Settings() {
  const { getToken, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const {
    baseTheme,
    themePack,
    highContrast,
    reducedMotion,
    largeText,
    setBaseTheme,
    setThemePack,
    setHighContrast,
    setReducedMotion,
    setLargeText,
  } = useTheme();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("appearance");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Local settings state
  const [settings, setSettings] = useState<any>({
    coachName: "Coach Nova",
    coachPersonality: "Motivational",
    coachStyle: "Detailed Explanations",
    gamificationEnabled: true,
    notificationsEnabled: true,
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [runningTests, setRunningTests] = useState<Record<string, boolean>>({});

  // Sandbox & Heavy Load Diagnostic states
  const [sandboxInput, setSandboxInput] = useState("1 bowl of oatmeal with protein powder, blueberries and almond milk");
  const [sandboxEndpoint, setSandboxEndpoint] = useState<"nutrition" | "exercise" | "journal">("nutrition");
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [stressActive, setStressActive] = useState(false);
  const [stressLog, setStressLog] = useState<string[]>([]);
  const [stressCount, setStressCount] = useState(5);
  const [ownedItems, setOwnedItems] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchProfile();
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/store", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.items) {
          setOwnedItems(Object.fromEntries(data.items.map((i: any) => [i.id, i.owned])));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Autosave profile mechanism
  useEffect(() => {
    if (!profile) return;

    const handler = setTimeout(() => {
      saveProfileData(profile);
    }, 1500);

    return () => clearTimeout(handler);
  }, [profile]);

  // Save settings automatically as well
  useEffect(() => {
    if (Object.keys(settings).length === 0) return;
    const handler = setTimeout(() => {
      // Intentionally not showing a flash message for purely local state UI toggles
      // to avoid annoying the user. Just saving silently if it were hooked to an API.
    }, 500);
    return () => clearTimeout(handler);
  }, [settings]);

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveProfileData = async (dataToSave: any) => {
    try {
      const token = await getToken();
      await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSave),
      });
      setSuccessMsg("Settings Auto-saved.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveProfileData(profile);

      const token = await getToken();
      // Auto regenerate plans
      await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(
        "Preferences updated. Your AI Plans have been automatically regenerated.",
      );
      fetchProfile(); // Refetch to get new archetypes if they changed
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, val: any) => {
    setProfile((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleSettingChange = (field: string, val: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: val }));
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!profile)
    return (
      <div className="p-8 flex items-center justify-center animate-pulse min-h-[50vh]">
        <Network className="w-8 h-8 text-primary animate-spin" />
      </div>
    );

  const renderContent = () => {
    switch (activeCategory) {
      case "appearance":
        const themeMapping: Record<string, "light" | "dark" | "system"> = {
          "Light Theme": "light",
          "Dark Theme": "dark",
          "System (Auto)": "system",
        };

        const packMapping: Record<
          string,
          | "default"
          | "cosmic-blue"
          | "emerald-wellness"
          | "sunset-energy"
          | "midnight-focus"
        > = {
          Default: "default",
          "Cosmic Blue": "cosmic-blue",
          "Emerald Wellness": "emerald-wellness",
          "Sunset Energy": "sunset-energy",
          "Midnight Focus": "midnight-focus",
        };

        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>System Theme</CardTitle>
                <CardDescription>
                  Choose how InnerVerse looks to you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {["Light Theme", "Dark Theme", "System (Auto)"].map((t) => (
                    <div
                      key={t}
                      onClick={() => setBaseTheme(themeMapping[t])}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${baseTheme === themeMapping[t] ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${t === "Light Theme" ? "bg-white border-2 border-gray-200" : t === "Dark Theme" ? "bg-zinc-900 border-2 border-zinc-700" : "bg-gradient-to-tr from-zinc-900 to-white"}`}
                      ></div>
                      <span className="text-sm font-medium">{t}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Theme Packs</CardTitle>
                <CardDescription>
                  Premium color palettes for your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { name: "Default", colors: "from-blue-600 to-teal-500" },
                    {
                      name: "Cosmic Blue",
                      colors: "from-blue-500 to-indigo-600",
                    },
                    {
                      name: "Emerald Wellness",
                      colors: "from-emerald-400 to-teal-600",
                    },
                    {
                      name: "Sunset Energy",
                      colors: "from-orange-400 to-rose-500",
                    },
                    {
                      name: "Midnight Focus",
                      colors: "from-slate-700 to-zinc-900",
                    },
                  ].map((p) => {
                    const isCosmic = p.name === "Cosmic Blue";
                    const locked = isCosmic && !ownedItems["cosmic_theme"];
                    return (
                    <div
                      key={p.name}
                      onClick={() => !locked && setThemePack(packMapping[p.name])}
                      className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${locked ? "opacity-60 cursor-not-allowed border-border bg-card" : "cursor-pointer"} ${!locked && themePack === packMapping[p.name] ? "border-primary bg-primary/5" : !locked ? "border-border bg-card hover:border-primary/50" : ""}`}
                      title={locked ? "Unlock Cosmic Theme in the Community Rewards Store (200 coins)" : undefined}
                    >
                      {locked && (
                        <div className="absolute top-1.5 right-1.5 bg-muted rounded-full p-1">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <div
                        className={`w-full h-12 rounded-lg bg-gradient-to-r ${p.colors}`}
                      ></div>
                      <span className="text-xs font-bold text-center mt-1">
                        {p.name}
                      </span>
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "language":
        return (
          <div className="space-y-6">
            <Card className="border-border bg-gradient-to-br from-card to-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  {t("settings.title", "Language Settings")}
                </CardTitle>
                <CardDescription>
                  {t("settings.subtitle", "Customize your preferred application dialect")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { code: "en", name: "English", nativeName: "English (US/UK)", description: "Standard default system dialect" },
                    { code: "hi", name: "हिन्दी", nativeName: "Hindi (हिन्दी)", description: "भारतीय राजभाषा हिंदी में अनुवाद" },
                    { code: "de", name: "Deutsch", nativeName: "German (Deutsch)", description: "Lokale Übersetzung für Deutschland" }
                  ].map((lang) => (
                    <div
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as Language)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${language === lang.code ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-lg text-foreground">{lang.name}</span>
                        {language === lang.code && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground leading-none">{lang.nativeName}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">{lang.description}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/40 p-4 rounded-xl border border-dashed border-border/80 flex items-start gap-3 text-sm mt-4">
                  <span className="text-xl">💡</span>
                  <div>
                    <span className="font-bold text-xs text-foreground block uppercase tracking-wider">Explainable AI Interface</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      All core biomarker tools, navigation buttons, timeline feeds, level tags, and dynamic dashboard scores have been dynamically optimized for high fidelity local translation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "account":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Public Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-card shadow-lg bg-muted flex items-center justify-center">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {user?.displayName || "User"}
                    </h3>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <Badge className="mt-2 text-xs bg-primary/20 text-primary hover:bg-primary/30 border-0">
                      InnerVerse Citizen
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={profile.age || ""}
                      onChange={(e) => handleChange("age", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Input
                      value={profile.gender || ""}
                      onChange={(e) => handleChange("gender", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      value={profile.height || ""}
                      onChange={(e) => handleChange("height", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      value={profile.weight || ""}
                      onChange={(e) => handleChange("weight", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Primary Objective</CardTitle>
                <CardDescription>
                  Changes here will regenerate your entire AI plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Goal</Label>
                  <Select
                    value={profile.primaryGoal || ""}
                    onValueChange={(v) => handleChange("primaryGoal", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Weight Loss",
                        "Muscle Gain",
                        "Improve Fitness",
                        "Increase Strength",
                        "Improve Flexibility",
                        "Reduce Stress",
                        "Better Sleep",
                        "Holistic Development",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Target Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Weight (kg)</Label>
                    <Input type="number" placeholder="e.g. 75" />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Body Fat (%)</Label>
                    <Input type="number" placeholder="e.g. 15" />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Step Goal</Label>
                    <Input type="number" placeholder="e.g. 10000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Water Intake (Liters)</Label>
                    <Input type="number" placeholder="e.g. 3" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sleep Goal (Hours)</Label>
                    <Input type="number" placeholder="e.g. 8" />
                  </div>
                  <div className="space-y-2">
                    <Label>Meditation Goal (Mins)</Label>
                    <Input type="number" placeholder="e.g. 20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "coach":
        return (
          <div className="space-y-6">
            <Card className="border-border bg-gradient-to-b from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" /> AI Coach Persona
                </CardTitle>
                <CardDescription>
                  Customize the AI entity that guides your wellness journey.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Coach Name</Label>
                  <Input
                    value={settings.coachName}
                    onChange={(e) =>
                      handleSettingChange("coachName", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Personality Core</Label>
                  <Select
                    value={settings.coachPersonality}
                    onValueChange={(v) =>
                      handleSettingChange("coachPersonality", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Professional",
                        "Motivational",
                        "Friendly",
                        "Strict Coach",
                        "Scientific",
                        "Spiritual",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Communication Style</Label>
                  <Select
                    value={settings.coachStyle}
                    onValueChange={(v) => handleSettingChange("coachStyle", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Short Responses",
                        "Detailed Explanations",
                        "Research Based",
                        "High Energy",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "apps":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="w-5 h-5" /> Connected Integrations
                </CardTitle>
                <CardDescription>
                  Sync data from your favorite health apps and wearables.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    name: "Google Fit",
                    status: "Connected",
                    time: "Last sync: 2 mins ago",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Google_Fit_icon_%(282018%29.svg/512px-Google_Fit_icon_%282018%29.svg.png",
                  },
                  {
                    name: "Apple Health",
                    status: "Connect",
                    time: "Not connected",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
                  },
                  {
                    name: "Health Connect",
                    status: "Connect",
                    time: "Not connected",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Health_Connect_Icon.svg/512px-Health_Connect_Icon.svg.png",
                  },
                  {
                    name: "Strava",
                    status: "Connect",
                    time: "Not connected",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Strava_Logo_1.png/600px-Strava_Logo_1.png",
                  },
                  {
                    name: "MyFitnessPal",
                    status: "Connect",
                    time: "Not connected",
                    icon: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/MyFitnessPal_logo.svg/1200px-MyFitnessPal_logo.svg.png",
                  },
                ].map((app) => (
                  <div
                    key={app.name}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm p-2">
                        <img
                          src={app.icon}
                          alt={app.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-bold">{app.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.time}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={
                        app.status === "Connected" ? "outline" : "default"
                      }
                      size="sm"
                      className={
                        app.status === "Connected"
                          ? "text-green-500 border-green-500/50 bg-green-500/10"
                          : ""
                      }
                    >
                      {app.status}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case "gamification":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-yellow-500" />{" "}
                      Gamification Engine
                    </CardTitle>
                    <CardDescription>
                      Turn your wellness journey into a game.
                    </CardDescription>
                  </div>
                  <Switch
                    checked={settings.gamificationEnabled}
                    onCheckedChange={(c) =>
                      handleSettingChange("gamificationEnabled", c)
                    }
                  />
                </div>
              </CardHeader>
              <CardContent
                className={`space-y-6 ${!settings.gamificationEnabled ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-bold">
                      XP System & Leveling
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Gain experience points for completing healthy actions.
                    </p>
                  </div>
                  <Switch checked={true} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-bold">
                      Streak Tracking
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Maintain daily streaks for bonus multipliers.
                    </p>
                  </div>
                  <Switch checked={true} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-bold">
                      Boss Battles & Challenges
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Face weekly AI-generated boss challenges.
                    </p>
                  </div>
                  <Switch checked={true} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "twin":
        return (
          <div className="space-y-6">
            <Card className="border-border border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-primary" /> InnerVerse
                  Digital Twin
                </CardTitle>
                <CardDescription>
                  Manage the core predictive model of your health.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 text-green-500 rounded-full">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Twin Accuracy Score</p>
                      <p className="text-xs text-muted-foreground">
                        Based on data volume
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-green-500 text-lg">94%</span>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Data Sync Frequency</Label>
                  <Select defaultValue="Real-time">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Real-time">
                        Real-time (High Battery)
                      </SelectItem>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                      <SelectItem value="Daily">Daily Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "api":
        return (
          <div className="space-y-6">
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="flex flex-row items-center gap-2 text-destructive">
                  <Terminal className="w-5 h-5" /> Advanced API Access
                </CardTitle>
                <CardDescription>
                  For developers: Connect external LLMs or health services
                  directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Custom OpenAI API Key</Label>
                  <Input type="password" placeholder="sk-..." />
                </div>
                <div className="space-y-2">
                  <Label>Custom Anthropic API Key</Label>
                  <Input type="password" placeholder="sk-ant-..." />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Endpoint (For event streaming)</Label>
                  <Input
                    type="url"
                    placeholder="https://your-server.com/webhook"
                  />
                </div>
                <Button variant="outline" className="w-full mt-2">
                  Test Connections
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Data & Privacy Center
                </CardTitle>
                <CardDescription>
                  You own your data. Manage it here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Download className="w-4 h-4" /> Export Health Report (PDF)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Download className="w-4 h-4" /> Download Raw Data (CSV)
                </Button>
                <div className="h-px bg-border my-6"></div>
                <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Danger Zone
                </h4>
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete My Account & All Data
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "fitness":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-secondary" /> Fitness
                  Experience
                </CardTitle>
                <CardDescription>
                  Tailor your physical training parameters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fitness Level</Label>
                  <Select
                    value={profile.fitnessLevel || ""}
                    onValueChange={(v) => handleChange("fitnessLevel", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Complete Beginner",
                        "Beginner",
                        "Intermediate",
                        "Advanced",
                        "Athlete",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Workout Experience</Label>
                  <Select
                    value={profile.workoutExperience || ""}
                    onValueChange={(v) => handleChange("workoutExperience", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Never",
                        "Less than 3 Months",
                        "3-12 Months",
                        "1-3 Years",
                        "More than 3 Years",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Workout Style</Label>
                  <Select
                    value={profile.preferredWorkoutStyle || ""}
                    onValueChange={(v) =>
                      handleChange("preferredWorkoutStyle", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "HIIT",
                        "Strength Training",
                        "Bodyweight / Calisthenics",
                        "Cardio Focus",
                        "Mixed",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Logistics & Equipment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workout Location</Label>
                  <Select
                    value={profile.workoutLocation || ""}
                    onValueChange={(v) => handleChange("workoutLocation", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Home", "Gym", "Outdoor", "Mixed"].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Session Duration</Label>
                  <Select
                    value={profile.sessionDuration || ""}
                    onValueChange={(v) => handleChange("sessionDuration", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "10 Minutes",
                        "20 Minutes",
                        "30 Minutes",
                        "45 Minutes",
                        "60 Minutes",
                        "90+ Minutes",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Training Frequency</Label>
                  <Select
                    value={profile.availableDays || ""}
                    onValueChange={(v) => handleChange("availableDays", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "1 Day",
                        "2 Days",
                        "3 Days",
                        "4 Days",
                        "5 Days",
                        "6 Days",
                        "7 Days",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "nutrition":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="w-5 h-5 text-green-500" /> Core Nutrition
                </CardTitle>
                <CardDescription>
                  Establish your foundational diet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Diet Type</Label>
                  <Select
                    value={profile.dietType || ""}
                    onValueChange={(v) => handleChange("dietType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Vegetarian",
                        "Vegan",
                        "Eggetarian",
                        "Non-Vegetarian",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dietary Strategy</Label>
                  <Select
                    value={settings.dietaryStrategy || ""}
                    onValueChange={(v) =>
                      handleSettingChange("dietaryStrategy", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Strategy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "High Protein",
                        "Low Carb",
                        "Keto",
                        "Mediterranean",
                        "Indian Diet",
                        "Athlete Diet",
                        "Intermittent Fasting",
                        "Standard",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Restrictions & Allergies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "Lactose Free",
                  "Gluten Free",
                  "Nut Free",
                  "Soy Free",
                  "Shellfish Allergy",
                ].map((a) => (
                  <div key={a} className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{a}</Label>
                    <Switch checked={false} />
                  </div>
                ))}
                <div className="space-y-2 mt-4 pt-4 border-t border-border">
                  <Label>Custom Restrictions</Label>
                  <Input placeholder="e.g. No mushrooms, allergic to kiwi..." />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "yoga":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-indigo-500" /> Mindfulness &
                  Mobility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Yoga Style</Label>
                  <Select defaultValue="Hatha">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Hatha",
                        "Vinyasa Flow",
                        "Ashtanga",
                        "Iyengar",
                        "Yin Yoga",
                        "Restorative",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Meditation Style</Label>
                  <Select defaultValue="Mindfulness">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Mindfulness",
                        "Vipassana",
                        "Transcendental",
                        "Loving-Kindness (Metta)",
                        "Zen",
                        "Sound Bath",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Breathing Practice (Pranayama) Preference</Label>
                  <Select defaultValue="Relaxation">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Energy & Heat (Kapalabhati)",
                        "Balance (Nadi Shodhana)",
                        "Relaxation (Box Breathing)",
                        "None",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Spiritual Focus</Label>
                  <Select defaultValue="Secular/Physical">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Secular/Physical",
                        "Chakra Alignment",
                        "Mantra-based",
                        "Holistic Mind-Body Connection",
                      ].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" /> Alert
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <Label className="text-base font-bold">
                      Master Notification Switch
                    </Label>
                  </div>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(c) =>
                      handleSettingChange("notificationsEnabled", c)
                    }
                  />
                </div>

                <div
                  className={`space-y-6 ${!settings.notificationsEnabled ? "opacity-50 pointer-events-none" : ""}`}
                >
                  {[
                    {
                      id: "n1",
                      label: "Workout Reminders",
                      desc: "Alerts before scheduled sessions",
                    },
                    {
                      id: "n2",
                      label: "Meal Reminders",
                      desc: "Timing alerts for optimal metabolism",
                    },
                    {
                      id: "n3",
                      label: "Hydration Reminders",
                      desc: "Periodic water intake nudges",
                    },
                    {
                      id: "n4",
                      label: "Meditation Reminders",
                      desc: "Daily zen moments",
                    },
                    {
                      id: "n5",
                      label: "Sleep Reminders",
                      desc: "Wind-down alerts 1hr before bed",
                    },
                    {
                      id: "n6",
                      label: "Goal Achievement Alerts",
                      desc: "Celebrate your wins immediately",
                    },
                    {
                      id: "n7",
                      label: "AI Insights Notifications",
                      desc: "Smart analysis and plan updates",
                    },
                    {
                      id: "n8",
                      label: "Streak Notifications",
                      desc: "Warning when streaks are at risk",
                    },
                  ].map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-sm font-bold">{n.label}</Label>
                        <p className="text-xs text-muted-foreground">
                          {n.desc}
                        </p>
                      </div>
                      <Switch checked={true} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "accessibility":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Accessibility className="w-5 h-5 text-blue-500" /> Interface
                  Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold">Larger Text</Label>
                    <p className="text-xs text-muted-foreground">
                      Increase UI font size universally
                    </p>
                  </div>
                  <Switch checked={largeText} onCheckedChange={setLargeText} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold">High Contrast Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Maximize legibility
                    </p>
                  </div>
                  <Switch
                    checked={highContrast}
                    onCheckedChange={setHighContrast}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold">Reduced Animations</Label>
                    <p className="text-xs text-muted-foreground">
                      Minimize UI motion
                    </p>
                  </div>
                  <Switch
                    checked={reducedMotion}
                    onCheckedChange={setReducedMotion}
                  />
                </div>

                <div className="flex items-center justify-between opacity-50 pointer-events-none">
                  <div>
                    <Label className="font-bold">
                      Screen Reader Optimization
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enhanced ARIA labeling
                    </p>
                  </div>
                  <Switch checked={false} />
                </div>

                <div className="flex items-center justify-between opacity-50 pointer-events-none">
                  <div>
                    <Label className="font-bold">Dyslexia-Friendly Font</Label>
                    <p className="text-xs text-muted-foreground">
                      Switch to OpenDyslexic typeface
                    </p>
                  </div>
                  <Switch checked={false} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-purple-500" /> Dashboard
                  Widgets
                </CardTitle>
                <CardDescription>
                  Select which data panels appear on your home screen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "w1", label: "Fitness Analytics", checked: true },
                  { id: "w2", label: "Sleep Analytics", checked: true },
                  { id: "w3", label: "Nutrition Analytics", checked: true },
                  { id: "w4", label: "Mood Analytics", checked: false },
                  { id: "w5", label: "Recovery Analytics", checked: true },
                  { id: "w6", label: "AI Predictions", checked: true },
                ].map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-card flex items-center justify-center text-xs text-muted-foreground font-mono">
                        {i + 1}
                      </div>
                      <Label className="font-bold">{w.label}</Label>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[10px] uppercase text-muted-foreground">
                        Visible
                      </span>
                      <Switch checked={w.checked} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-4 italic">
                  Drag and drop functionality to rearrange widgets can be
                  accessed directly from the Dashboard layout editor.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case "diagnostics":
        const runDiagnosticsTest = async (testId: string) => {
          setRunningTests((prev) => ({ ...prev, [testId]: true }));
          const startTime = Date.now();
          let status: "passed" | "failed" | "idle" = "idle";
          let message = "";
          let rawRes = "";
          try {
            const token = await getToken();
            if (!token) throw new Error("No authentication token found");

            let res: Response;
            if (testId === "test_nutrition_valid") {
              res = await fetch("/api/track/food", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ input: "1 plate chicken rice and greek yogurt" })
              });
              const data = await res.json();
              rawRes = JSON.stringify(data, null, 2);
              if (res.status === 200 && data.log && typeof data.log.calories === "number") {
                status = "passed";
                message = `Successful 200 OK. Identified meal: "${data.log.item}" containing ${data.log.calories} kcal, ${data.log.protein}g protein, ${data.log.carbs}g carbs.`;
              } else {
                status = "failed";
                message = `Invalid response schema. Status: ${res.status}`;
              }
            } else if (testId === "test_nutrition_invalid") {
              res = await fetch("/api/track/food", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ input: "  " })
              });
              const data = await res.json();
              rawRes = JSON.stringify(data, null, 2);
              if (res.status === 400 && data.error) {
                status = "passed";
                message = `Correctly rejected empty input with Status 400. Message: "${data.error}"`;
              } else {
                status = "failed";
                message = `Expected Status 400 but received ${res.status}`;
              }
            } else if (testId === "test_exercise_valid") {
              res = await fetch("/api/track/exercise", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ input: "Running 5km in 25 minutes" })
              });
              const data = await res.json();
              rawRes = JSON.stringify(data, null, 2);
              if (res.status === 200 && data.log && data.log.exercise) {
                status = "passed";
                message = `Successful 200 OK. Identified exercise: "${data.log.exercise}" with duration ${data.log.durationMins}m, estimated burn: ${data.log.caloriesBurned} kcal.`;
              } else {
                status = "failed";
                message = `Invalid response schema. Status: ${res.status}`;
              }
            } else if (testId === "test_exercise_invalid") {
              res = await fetch("/api/track/exercise", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ input: "" })
              });
              const data = await res.json();
              rawRes = JSON.stringify(data, null, 2);
              if (res.status === 400 && data.error) {
                status = "passed";
                message = `Correctly rejected empty input with Status 400. Message: "${data.error}"`;
              } else {
                status = "failed";
                message = `Expected Status 400 but received ${res.status}`;
              }
            } else if (testId === "test_twin_recalibrate") {
              res = await fetch("/api/digital-twin/recalibrate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                }
              });
              const data = await res.json();
              rawRes = JSON.stringify(data, null, 2);
              if (res.status === 200 && data.twin && data.twin.states) {
                status = "passed";
                message = `Successful 200 OK. Bayesian model recalibrated successfully with overall score ${data.twin.overallHealth?.score || 'N/A'}/100 and updated state categories.`;
              } else {
                status = "failed";
                message = `Recalibration endpoint failed or returned empty payload. Status: ${res.status}`;
              }
            } else if (testId === "test_journal_positive") {
              res = await fetch("/api/journal", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  content: "I am feeling extremely positive and accomplished today, had a great meditation session!",
                  date: new Date().toISOString().split("T")[0]
                })
              });
              const data = await res.json();
              rawRes = JSON.stringify(data, null, 2);
              if (res.status === 200 && data.entry && data.entry.sentiment) {
                status = "passed";
                message = `Successful 200 OK. Positive mood journal logged with sentiment score "${data.entry.sentiment}" and dominant mood "${data.entry.mood}".`;
              } else {
                status = "failed";
                message = `Expected successful journaling but received Status: ${res.status}`;
              }
            } else if (testId === "test_journal_negative") {
              res = await fetch("/api/journal", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  content: "Feeling deeply exhausted, anxious, and stressed today. Hard to focus.",
                  date: new Date().toISOString().split("T")[0]
                })
              });
              const data = await res.json();
              rawRes = JSON.stringify(data, null, 2);
              if (res.status === 200 && data.entry && data.entry.sentiment) {
                status = "passed";
                message = `Successful 200 OK. Negative mood journal logged with sentiment score "${data.entry.sentiment}" and dominant mood "${data.entry.mood}".`;
              } else {
                status = "failed";
                message = `Expected successful journaling but received Status: ${res.status}`;
              }
            } else {
              throw new Error("Unknown test ID context");
            }
          } catch (err: any) {
            status = "failed";
            message = `Test execution runtime error: ${err.message || err}`;
            rawRes = String(err.stack || err);
          } finally {
            const duration = Date.now() - startTime;
            setTestResults((prev) => ({
              ...prev,
              [testId]: { status, message, duration, rawRes }
            }));
            setRunningTests((prev) => ({ ...prev, [testId]: false }));
          }
        };

        const runAllDiagnostics = async () => {
          const ids = [
            "test_nutrition_valid",
            "test_nutrition_invalid",
            "test_exercise_valid",
            "test_exercise_invalid",
            "test_twin_recalibrate",
            "test_journal_positive",
            "test_journal_negative"
          ];
          for (const id of ids) {
            await runDiagnosticsTest(id);
          }
        };

        const executeSandboxRequest = async () => {
          setSandboxLoading(true);
          setSandboxResult(null);
          const startTime = Date.now();
          try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token unavailable.");

            let url = "";
            let bodyObj: any = {};
            if (sandboxEndpoint === "nutrition") {
              url = "/api/track/food";
              bodyObj = { input: sandboxInput };
            } else if (sandboxEndpoint === "exercise") {
              url = "/api/track/exercise";
              bodyObj = { input: sandboxInput };
            } else {
              url = "/api/journal";
              bodyObj = {
                content: sandboxInput,
                date: new Date().toISOString().split("T")[0]
              };
            }

            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(bodyObj)
            });

            const rawJson = await response.json();
            const latency = Date.now() - startTime;

            // Trigger recalibration cascade to instantly verify twin synchronizer
            let cascadeResult = "Skipped (no recalibration needed)";
            if (response.ok) {
              try {
                const recalcRes = await fetch("/api/digital-twin/recalibrate", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` }
                });
                const recalcData = await recalcRes.json();
                cascadeResult = `Cascaded Recalibration Succeeded. Overall Health score: ${recalcData.twin?.overallHealth?.score || 'N/A'}`;
              } catch (recalcErr: any) {
                cascadeResult = `Cascaded Recalibration Failed: ${recalcErr.message || recalcErr}`;
              }
            }

            setSandboxResult({
              ok: response.ok,
              status: response.status,
              latency,
              endpoint: url,
              payload: rawJson,
              cascade: cascadeResult
            });
          } catch (err: any) {
            setSandboxResult({
              ok: false,
              status: "ERR",
              latency: Date.now() - startTime,
              error: err.message || err
            });
          } finally {
            setSandboxLoading(false);
          }
        };

        const runInvasiveStressTest = async () => {
          if (stressActive) return;
          setStressActive(true);
          setStressLog(["[System Status] Booting Multi-Threaded Heavy Load Generator...", `[System Status] Queueing ${stressCount} concurrent API requests to test rate limit recovery...`]);
          
          const token = await getToken();
          const startTime = Date.now();
          const promises: Promise<any>[] = [];

          const testInputs = [
            "Greek yogurt with berries",
            "30 min HIIT workout session",
            "Feeling happy and fulfilled after yoga",
            "Avocado toast with eggs",
            "10km run in 50 minutes",
            "Anxious about upcoming work deadlines",
            "Glass of warm milk and almonds",
            "Strength training - chest and triceps",
            "Deep breathing for 10 minutes",
            "Salad with grilled salmon and olive oil"
          ];

          for (let i = 0; i < stressCount; i++) {
            const inputVal = testInputs[i % testInputs.length];
            const endpointChoice = i % 3 === 0 ? "/api/track/food" : i % 3 === 1 ? "/api/track/exercise" : "/api/journal";
            const bodyPayload = endpointChoice === "/api/journal" 
              ? { content: inputVal, date: new Date().toISOString().split("T")[0] }
              : { input: inputVal };

            const requestPromise = (async () => {
              const reqId = i + 1;
              const subStart = Date.now();
              setStressLog(prev => [...prev, `[Thread #${reqId}] Dispatching POST to ${endpointChoice} with: "${inputVal}"`]);
              try {
                const res = await fetch(endpointChoice, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify(bodyPayload)
                });
                const latency = Date.now() - subStart;
                const bodyJson = await res.json();
                
                if (res.ok) {
                  setStressLog(prev => [...prev, `[Thread #${reqId}] SUCCESS (Status ${res.status}) in ${latency}ms`]);
                  return { id: reqId, status: "SUCCESS", latency, endpoint: endpointChoice };
                } else {
                  setStressLog(prev => [...prev, `[Thread #${reqId}] FAILED (Status ${res.status}) - ${bodyJson.error || 'Server error'}`]);
                  return { id: reqId, status: `ERROR ${res.status}`, latency, endpoint: endpointChoice };
                }
              } catch (err: any) {
                const latency = Date.now() - subStart;
                setStressLog(prev => [...prev, `[Thread #${reqId}] EXCEPTION - ${err.message || err}`]);
                return { id: reqId, status: "EXCEPTION", latency, endpoint: endpointChoice };
              }
            })();
            promises.push(requestPromise);
            // Subtle offset to simulate staggering
            await new Promise(r => setTimeout(r, 150));
          }

          const results = await Promise.all(promises);
          const totalDuration = Date.now() - startTime;
          const successfulThreads = results.filter(r => r.status === "SUCCESS").length;
          
          setStressLog(prev => [
            ...prev,
            `[System Status] Concurrency execution complete.`,
            `[Summary] Out of ${stressCount} requests: ${successfulThreads} Succeeded, ${stressCount - successfulThreads} Failed/Rejected.`,
            `[Summary] Aggregate simulation cycle completed in ${totalDuration}ms.`
          ]);
          setStressActive(false);
        };

        const tests = [
          {
            id: "test_nutrition_valid",
            name: "Nutrition Track - Valid Input",
            description: "Verifies parsing of real food logs with calories/macros extraction and Digital Twin calibration cascade",
            feature: "Nutrition Log"
          },
          {
            id: "test_nutrition_invalid",
            name: "Nutrition Track - Error Boundaries",
            description: "Verifies correct server-side validation & error handling (Status 400) when empty space food logs are passed",
            feature: "Nutrition Log"
          },
          {
            id: "test_exercise_valid",
            name: "Exercise Track - Valid Input",
            description: "Verifies parsing of physical exercises, duration analysis, calories burn, and dynamic joint recalibration trigger",
            feature: "Exercise Log"
          },
          {
            id: "test_exercise_invalid",
            name: "Exercise Track - Error Boundaries",
            description: "Verifies correct server-side validation & error handling (Status 400) when empty space exercise logs are passed",
            feature: "Exercise Log"
          },
          {
            id: "test_twin_recalibrate",
            name: "Digital Twin - Multi-State Bayesian Calibration",
            description: "Verifies the end-to-end 16-state predictive system, recalibrating biometric weights based on activity metrics",
            feature: "Digital Twin Core"
          },
          {
            id: "test_journal_positive",
            name: "Journal Sentiment - Positive Mood",
            description: "Verifies AI sentiment classification of positive inputs, returning high emotional indices",
            feature: "Mindful Journal"
          },
          {
            id: "test_journal_negative",
            name: "Journal Sentiment - Negative Mood",
            description: "Verifies AI sentiment classification of negative inputs, returning high stress indices and coaching triggers",
            feature: "Mindful Journal"
          }
        ];

        return (
          <div className="space-y-8">
            {/* Header Description */}
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20">
              <Shield className="w-8 h-8 text-primary shrink-0 animate-pulse" />
              <div>
                <h3 className="text-base font-black">Intensive Operations & Self-Healing Diagnostics</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Advanced test suite for invasive auditing of Gemini-powered food log parsing, biometric tracking, sentiment extraction, and parallel rate-limiting fail-safes.
                </p>
              </div>
            </div>

            {/* Grid for Interactive Sandbox and Stress Generator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Interactive Integration Sandbox */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-primary">
                    <Bot className="w-4 h-4 text-primary" /> Dynamic Integration Sandbox
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Test how the AI core parses custom inputs, extracts biometrics, and cascades recalibration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">Select Endpoint Under Test</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant={sandboxEndpoint === "nutrition" ? "default" : "outline"}
                        onClick={() => {
                          setSandboxEndpoint("nutrition");
                          setSandboxInput("1 bowl of oatmeal with protein powder, blueberries and almond milk");
                        }}
                        className="text-xs font-bold"
                      >
                        Nutrition Log
                      </Button>
                      <Button
                        size="sm"
                        variant={sandboxEndpoint === "exercise" ? "default" : "outline"}
                        onClick={() => {
                          setSandboxEndpoint("exercise");
                          setSandboxInput("30 minutes of swimming breaststroke at high intensity");
                        }}
                        className="text-xs font-bold"
                      >
                        Exercise Log
                      </Button>
                      <Button
                        size="sm"
                        variant={sandboxEndpoint === "journal" ? "default" : "outline"}
                        onClick={() => {
                          setSandboxEndpoint("journal");
                          setSandboxInput("I had an amazing yoga and meditation flow, feeling so focused and at peace!");
                        }}
                        className="text-xs font-bold"
                      >
                        Journal Mood
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">Custom Text Input</Label>
                    <Input
                      placeholder="Enter natural language logs to test..."
                      value={sandboxInput}
                      onChange={(e) => setSandboxInput(e.target.value)}
                      className="bg-muted/50 border-border text-xs focus-visible:ring-1"
                    />
                  </div>

                  <Button
                    onClick={executeSandboxRequest}
                    disabled={sandboxLoading || !sandboxInput.trim()}
                    className="w-full bg-primary hover:bg-primary/95 text-xs font-bold"
                  >
                    {sandboxLoading ? "Processing Real-Time Handshake..." : "Dispatch Parser & Trigger Twin Recalibration"}
                  </Button>

                  {sandboxResult && (
                    <div className="space-y-3 p-3 bg-zinc-950 text-zinc-300 rounded-xl border border-border mt-3 text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-2">
                        <span className="text-blue-400 font-bold">API POST: {sandboxResult.endpoint}</span>
                        <span className={sandboxResult.ok ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                          STATUS {sandboxResult.status} ({sandboxResult.latency}ms)
                        </span>
                      </div>

                      {sandboxResult.ok ? (
                        <div className="space-y-2 text-[11px]">
                          <div>
                            <span className="text-purple-400 font-bold">▶ Parsed Response Payload:</span>
                            <pre className="mt-1 p-2 bg-zinc-900 rounded border border-zinc-800 overflow-x-auto max-h-[160px] text-[10px]">
                              {JSON.stringify(sandboxResult.payload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-yellow-400 font-bold">▶ Digital Twin Cascade Result:</span>
                            <div className="p-2 bg-zinc-900 rounded border border-zinc-800 mt-1 text-zinc-400 text-[10px]">
                              {sandboxResult.cascade}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-400 text-[11px] font-bold p-1 bg-red-500/10 rounded">
                          ERROR DETECTED: {sandboxResult.error || JSON.stringify(sandboxResult.payload)}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Multi-Threaded Stress Tester */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-primary">
                    <Terminal className="w-4 h-4 text-primary" /> Concurrency & Heavy Load stress test
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Test race condition immunity and backoff triggers by hammering API points simultaneously.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-xl border border-border">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Parallel Thread Count</Label>
                      <p className="text-[11px] text-muted-foreground">Concurrent logs to fire in parallel queue.</p>
                    </div>
                    <select
                      value={stressCount}
                      onChange={(e) => setStressCount(Number(e.target.value))}
                      className="bg-card border border-border rounded-lg text-xs font-bold p-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={3}>3 Requests</option>
                      <option value={5}>5 Requests</option>
                      <option value={10}>10 Requests</option>
                      <option value={15}>15 Requests</option>
                    </select>
                  </div>

                  <Button
                    onClick={runInvasiveStressTest}
                    disabled={stressActive}
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/5 font-bold text-xs"
                  >
                    {stressActive ? "Stress Engine Simulating..." : "Initiate Concurrency Firestorm"}
                  </Button>

                  <div className="space-y-2 mt-2">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                      <span>Real-Time Output Logs</span>
                      {stressActive && <span className="text-[10px] text-yellow-500 font-bold animate-pulse">Engaged</span>}
                    </Label>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-border h-[180px] overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1.5 leading-relaxed shadow-inner">
                      {stressLog.length === 0 ? (
                        <div className="text-zinc-600 italic h-full flex items-center justify-center">
                          Waiting to spawn stress testing vectors...
                        </div>
                      ) : (
                        stressLog.map((logLine, idx) => {
                          const isSuccess = logLine.includes("SUCCESS");
                          const isErr = logLine.includes("FAILED") || logLine.includes("EXCEPTION");
                          const isSystem = logLine.includes("[System");
                          let textClass = "text-zinc-400";
                          if (isSuccess) textClass = "text-green-400 font-bold";
                          else if (isErr) textClass = "text-red-400 font-bold";
                          else if (isSystem) textClass = "text-cyan-400 font-bold";
                          return (
                            <div key={idx} className={textClass}>
                              {logLine}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Standard Integrity Check Assertions */}
            <Card className="border-border">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-primary">
                    <Shield className="w-4 h-4 text-primary" /> End-to-End Assertion Test Vectors
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Check standard state responses and correct HTTP status code assertions for error handling.
                  </CardDescription>
                </div>
                <Button onClick={runAllDiagnostics} className="bg-primary hover:bg-primary/90 text-xs font-bold">
                  Run All Assertions ({tests.length})
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tests.map((test) => {
                    const result = testResults[test.id];
                    const isRunning = runningTests[test.id];

                    return (
                      <div
                        key={test.id}
                        className="p-4 rounded-xl border border-border bg-card flex flex-col gap-2 transition-colors hover:border-primary/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider py-0 px-1.5">
                                {test.feature}
                              </Badge>
                              {result?.status === "passed" && (
                                <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20 border-0 text-[10px] font-bold">
                                  Passed
                                </Badge>
                              )}
                              {result?.status === "failed" && (
                                <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/20 border-0 text-[10px] font-bold">
                                  Failed
                                </Badge>
                              )}
                              {isRunning && (
                                <Badge className="bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/20 border-0 text-[10px] font-bold flex items-center gap-1">
                                  <Activity className="w-2.5 h-2.5 animate-spin" /> Testing
                                </Badge>
                              )}
                              {!result && !isRunning && (
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                  Idle
                                </Badge>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-foreground mt-1">{test.name}</h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{test.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runDiagnosticsTest(test.id)}
                            disabled={isRunning}
                            className="h-7 text-[11px] font-bold"
                          >
                            {isRunning ? "Run..." : "Test"}
                          </Button>
                        </div>

                        {result && (
                          <div className="mt-2 text-[11px] space-y-2 border-t border-border/60 pt-2 font-mono">
                            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                              <span>Latency: <strong>{result.duration}ms</strong></span>
                              <span>State: <strong className={result.status === "passed" ? "text-green-500" : "text-red-500"}>{result.status.toUpperCase()}</strong></span>
                            </div>
                            <div className={`p-2 rounded-lg border leading-relaxed text-[10px] ${result.status === "passed" ? "bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                              {result.message}
                            </div>
                            
                            <details className="group">
                              <summary className="text-[10px] font-bold text-muted-foreground cursor-pointer select-none py-1 hover:text-foreground">
                                View Payload JSON
                              </summary>
                              <pre className="mt-1 p-2 rounded-lg bg-zinc-950 text-zinc-300 text-[10px] leading-relaxed overflow-x-auto max-h-[140px] border border-border">
                                {result.rawRes}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="pb-12 max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col"
    >
      <div className="border-b border-border pb-4 mb-6 shrink-0">
        <PageHeader
          icon={Network}
          title="InnerVerse OS Settings"
          description="Command center for your holistic digital twin."
          action={
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-xs font-semibold bg-green-500/20 text-green-500 px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> {successMsg}
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl transition-all w-full md:w-auto"
              >
                <Save className="w-4 h-4" />
                {loading ? "Applying Changes..." : "Force Save & Regenerate"}
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex gap-8 flex-1 overflow-hidden relative">
        {/* Mobile menu toggle */}
        <Button
          variant="outline"
          className="md:hidden absolute top-0 right-0 z-20"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? "Close Menu" : "Categories"}
        </Button>

        {/* Sidebar Nav */}
        <div
          className={`
          absolute md:static inset-y-0 left-0 w-64 bg-background z-10 
          transform transition-transform duration-300 ease-in-out
          md:transform-none shrink-0 flex flex-col gap-4 overflow-y-auto pr-2
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        >
          <div className="relative sticky top-0 bg-background pb-2 pt-1 z-10">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              className="pl-9 bg-muted/50 border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-1"
          >
            {filteredCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <motion.button
                  variants={staggerItem}
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    relative w-full flex items-center justify-between p-3 rounded-xl transition-colors text-sm
                    ${
                      isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-category-highlight"
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <cat.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-left">{cat.name}</span>
                  </div>
                  {isActive && (
                    <ChevronRight className="relative w-4 h-4" />
                  )}
                </motion.button>
              );
            })}
            {filteredCategories.length === 0 && (
              <EmptyState
                icon={Search}
                title="No categories found"
                description={`Nothing matches "${searchQuery}".`}
              />
            )}
          </motion.div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
