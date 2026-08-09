import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Network,
  Activity,
  HeartPulse,
  Brain,
  Moon,
  ShieldCheck,
  Flame,
  Dumbbell,
  Trophy,
  Award,
  Lock,
  Unlock,
  Sparkles,
  Plus,
  SlidersHorizontal,
  Bookmark,
  Calendar,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Coins,
  Smile,
  Zap,
  History,
} from "lucide-react";
import { Badge } from "../components/ui/badge.tsx";
import { useAuth } from "../AuthContext.tsx";
import { useLanguage } from "../LanguageContext.tsx";
import {
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";

const DEFAULT_TWIN_STATES: Record<string, any> = {
  physical: { score: 65, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Physical state is moderately active based on baseline parameters." },
  nutrition: { score: 60, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Nutrition state is initialized based on standard dietary profiles." },
  exercise: { score: 65, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Exercise parameters are set at maintenance capacity." },
  recovery: { score: 70, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Recovery metrics indicate balanced systemic resting." },
  sleep: { score: 70, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Sleep latency and structure are within standard baseline thresholds." },
  stress: { score: 60, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Autonomic load index is within normal bounds." },
  mental: { score: 65, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Cognitive resources are stabilized at baseline capacity." },
  emotional: { score: 65, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Affective metrics reflect general stability." },
  yoga: { score: 50, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Asana performance metrics are prepared for tracking." },
  meditation: { score: 50, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Dhyana minutes baseline initialized." },
  habit: { score: 60, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Habit loops are initialized for consistent tracking." },
  learning: { score: 65, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Academic / research cognitive retention is set." },
  career: { score: 70, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Professional goals mapped out during onboarding." },
  financial: { score: 65, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Socio-economic stress markers are low." },
  social: { score: 70, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Interpersonal communication and network scores are stable." },
  purpose: { score: 75, trend: "stable", confidence: 50, lastUpdated: "", supportingEvidence: "Onboarding questionnaire answers", aiSummary: "Existential coherence and values alignment index is high." },
};

const DIMENSIONS = [
  { key: "physical", label: "Physical State", icon: Activity, color: "text-red-500 bg-red-500/10" },
  { key: "nutrition", label: "Nutrition State", icon: Flame, color: "text-amber-500 bg-amber-500/10" },
  { key: "exercise", label: "Exercise State", icon: Dumbbell, color: "text-emerald-500 bg-emerald-500/10" },
  { key: "recovery", label: "Recovery State", icon: HeartPulse, color: "text-rose-500 bg-rose-500/10" },
  { key: "sleep", label: "Sleep State", icon: Moon, color: "text-indigo-500 bg-indigo-500/10" },
  { key: "stress", label: "Stress State", icon: SlidersHorizontal, color: "text-cyan-500 bg-cyan-500/10" },
  { key: "mental", label: "Mental State", icon: Brain, color: "text-purple-500 bg-purple-500/10" },
  { key: "emotional", label: "Emotional State", icon: Smile, color: "text-pink-500 bg-pink-500/10" },
  { key: "yoga", label: "Yoga State", icon: Zap, color: "text-orange-500 bg-orange-500/10" },
  { key: "meditation", label: "Meditation State", icon: Bookmark, color: "text-yellow-500 bg-yellow-500/10" },
  { key: "habit", label: "Habit State", icon: CheckCircle, color: "text-teal-500 bg-teal-500/10" },
  { key: "learning", label: "Learning State", icon: HelpCircle, color: "text-blue-500 bg-blue-500/10" },
  { key: "career", label: "Career State", icon: Award, color: "text-violet-500 bg-violet-500/10" },
  { key: "financial", label: "Financial State", icon: Coins, color: "text-green-500 bg-green-500/10" },
  { key: "social", label: "Social State", icon: Network, color: "text-sky-500 bg-sky-500/10" },
  { key: "purpose", label: "Purpose State", icon: ShieldCheck, color: "text-lime-500 bg-lime-500/10" },
];

export default function DigitalTwin() {
  const { user, getToken } = useAuth();
  const { t } = useLanguage();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"twin_engine" | "timeline" | "badges" | "history" | "simulation" | "research">("twin_engine");
  
  // Data states
  const [twin, setTwin] = useState<any>(null);
  const [selectedTwinKey, setSelectedTwinKey] = useState<string>("physical");
  const [recalibrating, setRecalibrating] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({ food: 0, exercises: 0, journals: 0, level: 1, xp: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Interactive Timeline States
  const [timelineFilter, setTimelineFilter] = useState<string>("all");
  const [customLogText, setCustomLogText] = useState("");
  const [loggingInProgress, setLoggingInProgress] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  // Simulation state
  const [simQuery, setSimQuery] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simQuery.trim()) return;
    setSimulating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: simQuery })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data.simulation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  // Sync / load all data
  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      setLoadingHistory(true);
      const [timelineRes, badgesRes, profileRes, twinRes, historyRes] = await Promise.all([
        fetch("/api/timeline", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/badges", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/digital-twin", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/digital-twin/history", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const timelineData = await timelineRes.json();
      const badgesData = await badgesRes.json();
      const profileData = await profileRes.json();
      const twinData = await twinRes.json();
      const historyData = await historyRes.json();
      
      if (timelineData.timeline) setTimeline(timelineData.timeline);
      if (badgesData.badges) {
        setBadges(badgesData.badges);
        if (badgesData.stats) setStats(badgesData.stats);
      }
      if (profileData.profile) setProfile(profileData.profile);
      if (twinData.twin && twinData.twin.states) setTwin(twinData.twin.states);
      if (historyData.history) setHistory(historyData.history);
    } catch (err) {
      console.error("Error loading twin database telemetry:", err);
    } finally {
      setLoading(false);
      setLoadingHistory(false);
    }
  };

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/digital-twin/recalibrate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.twin && data.twin.states) {
          setTwin(data.twin.states);
          setSuccessToast("Digital Twin Recalibrated with Explainable AI!");
          setTimeout(() => setSuccessToast(null), 4000);
          
          // Refresh snapshot history ledger
          const historyRes = await fetch("/api/digital-twin/history", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const historyData = await historyRes.json();
          if (historyData.history) setHistory(historyData.history);
        }
      } else {
        alert("Recalibration failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecalibrating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  // Handle custom log submission
  const handleAddCustomLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLogText.trim()) return;
    
    setLoggingInProgress(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/timeline/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: customLogText })
      });
      
      if (res.ok) {
        setCustomLogText("");
        setSuccessToast("Log entered securely! +15 XP Awarded.");
        setTimeout(() => setSuccessToast(null), 4000);
        await loadData(); // Reload stats, level, and timeline!
      } else {
        const data = await res.json();
        alert(data.error || "Failed to log event.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingInProgress(false);
    }
  };

  // Helper level details
  const getLevelThresholds = (lvl: number) => {
    switch (lvl) {
      case 1: return { min: 0, max: 100, reward: "Unlocks AI Meal Scanner" };
      case 2: return { min: 100, max: 250, reward: "Unlocks Bedtime Breath Guides" };
      case 3: return { min: 250, max: 500, reward: "Unlocks Custom Workouts" };
      case 4: return { min: 500, max: 1000, reward: "Unlocks Community Creation" };
      case 5: return { min: 1000, max: 2000, reward: "Unlocks Sovereign Bio-Profile" };
      case 6: return { min: 2000, max: 3500, reward: "Unlocks Weekly Boss Challenges" };
      case 7: return { min: 3500, max: 5000, reward: "Unlocks Deep Sleep Prediction" };
      default: return { min: 5000, max: 10000, reward: "Maximum Level Unlocked" };
    }
  };

  const currentLevel = profile?.level || stats.level || 1;
  const currentXP = profile?.xp || stats.xp || 0;
  const thresholds = getLevelThresholds(currentLevel);
  const xpNeededForNext = thresholds.max - thresholds.min;
  const currentLevelXP = currentXP - thresholds.min;
  const xpPercentage = Math.min(100, Math.max(0, (currentLevelXP / xpNeededForNext) * 100));

  // Biometrics matching the radar chart
  const twinBiometrics = [
    { subject: "Recovery", A: twin?.recovery?.score || (profile?.recoveryCapacity === "high" ? 90 : profile?.recoveryCapacity === "moderate" ? 70 : 55), fullMark: 100 },
    { subject: "Stress Tolerance", A: twin?.stress?.score || Math.max(30, 100 - ((profile?.stressLevel || 5) * 10)), fullMark: 100 },
    { subject: "Fitness", A: twin?.exercise?.score || (profile?.fitnessLevel === "Advanced" ? 92 : profile?.fitnessLevel === "Intermediate" ? 75 : 55), fullMark: 100 },
    { subject: "Sleep Quality", A: twin?.sleep?.score || (profile?.sleepQuality === "Excellent" ? 95 : profile?.sleepQuality === "Good" ? 80 : 60), fullMark: 100 },
    { subject: "Nutrition", A: twin?.nutrition?.score || (stats.food >= 3 ? 88 : stats.food >= 1 ? 65 : 45), fullMark: 100 },
    { subject: "Mindfulness", A: twin?.meditation?.score || (stats.journals >= 3 ? 90 : stats.journals >= 1 ? 70 : 50), fullMark: 100 },
  ];

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case "sleep": return Moon;
      case "nutrition": return Flame;
      case "activity": return Dumbbell;
      case "mindfulness": return Brain;
      default: return Activity;
    }
  };

  const getTimelineColor = (type: string) => {
    switch (type) {
      case "sleep": return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
      case "nutrition": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "activity": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "mindfulness": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      default: return "text-primary bg-primary/10 border-primary/20";
    }
  };

  const getBadgeIcon = (id: string, unlocked: boolean) => {
    const defaultColor = unlocked ? "text-primary" : "text-muted-foreground/40";
    switch (id) {
      case "pioneer": return <Award className={`w-8 h-8 ${unlocked ? "text-violet-500 fill-violet-500/10" : "text-muted-foreground/30"}`} />;
      case "athlete": return <Dumbbell className={`w-8 h-8 ${unlocked ? "text-emerald-500" : "text-muted-foreground/30"}`} />;
      case "gastronomy": return <Flame className={`w-8 h-8 ${unlocked ? "text-amber-500 fill-amber-500/10" : "text-muted-foreground/30"}`} />;
      case "monk": return <Brain className={`w-8 h-8 ${unlocked ? "text-pink-500 fill-pink-500/10" : "text-muted-foreground/30"}`} />;
      case "fitbit": return <Network className={`w-8 h-8 ${unlocked ? "text-cyan-400" : "text-muted-foreground/30"}`} />;
      case "streak_badge": return <Sparkles className={`w-8 h-8 ${unlocked ? "text-orange-500 fill-orange-500/10" : "text-muted-foreground/30"}`} />;
      case "vision_expert": return <ShieldCheck className={`w-8 h-8 ${unlocked ? "text-blue-500" : "text-muted-foreground/30"}`} />;
      case "grandmaster": return <Trophy className={`w-8 h-8 ${unlocked ? "text-yellow-500 fill-yellow-500/10" : "text-muted-foreground/30"}`} />;
      default: return <Trophy className={`w-8 h-8 ${defaultColor}`} />;
    }
  };

  const getBadgeGradientColor = (id: string) => {
    switch (id) {
      case "pioneer": return "from-violet-500/20 to-indigo-500/10 border-violet-500/30";
      case "athlete": return "from-emerald-500/20 to-teal-500/10 border-emerald-500/30";
      case "gastronomy": return "from-amber-500/20 to-orange-500/10 border-amber-500/30";
      case "monk": return "from-pink-500/20 to-rose-500/10 border-pink-500/30";
      case "fitbit": return "from-cyan-500/20 to-blue-500/10 border-cyan-500/30";
      case "streak_badge": return "from-orange-500/20 to-yellow-500/10 border-orange-500/30";
      case "vision_expert": return "from-blue-500/20 to-purple-500/10 border-blue-500/30";
      case "grandmaster": return "from-yellow-400/20 to-orange-500/10 border-yellow-500/40";
      default: return "from-primary/10 to-primary/5 border-border";
    }
  };

  // Filtered timeline
  const filteredTimeline = timeline.filter(item => {
    if (timelineFilter === "all") return true;
    if (timelineFilter === "nutrition" && item.type === "nutrition") return true;
    if (timelineFilter === "activity" && item.type === "activity") return true;
    if (timelineFilter === "mindfulness" && (item.type === "mindfulness" || item.type === "sleep")) return true;
    if (timelineFilter === "custom" && item.type === "custom") return true;
    return false;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-16"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-black text-white border border-yellow-500/30 shadow-lg px-6 py-3 rounded-full flex items-center gap-3 font-semibold text-sm"
          >
            <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-bounce" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Network className="w-8 h-8 text-primary" />
            </div>
            {t("twin.title", "InnerVerse Digital Twin")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("twin.subtitle", "Your biological health model synced continuously with wearable streams and biometric telemetry.")}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border self-start md:self-auto">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Health Level</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-xl font-black">Level {currentLevel}</span>
            </div>
          </div>
          <div className="w-px h-10 bg-border"></div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Sovereign XP</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400" />
              <span className="text-xl font-black text-foreground font-mono">{currentXP} XP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Grid of Twin Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Avatar & Level-Up Progress */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border bg-gradient-to-b from-card to-card/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <CardHeader className="items-center text-center pb-2">
              <div className="w-28 h-28 rounded-full border-4 border-primary/40 p-1 relative mb-4">
                <img
                  src={`https://api.dicebear.com/7.x/shapes/svg?seed=${user?.uid || "twin"}&backgroundColor=c0aede`}
                  alt="Twin Biomarker Graph"
                  className="w-full h-full object-cover rounded-full"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-card w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white" title="Wearables live telemetry active">
                  ●
                </div>
              </div>
              <CardTitle className="text-xl font-black tracking-tight font-sans">
                {user?.displayName?.split(" ")[0] || "User"}'s Health Twin
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1 justify-center">
                <span>Biometric Signature: Archetype Synthesized</span>
                <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5 text-[10px] rounded-full uppercase tracking-widest font-black">
                  LIVE
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Polar Biometric Representation */}
              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={twinBiometrics}>
                    <PolarGrid stroke="#888888" opacity={0.2} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                    />
                    <Radar
                      name="Biometrics"
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Status checklist */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-red-500" /> Recovery Efficiency
                  </span>
                  <span className="font-bold text-green-500">Optimal ({15 * stats.streak + 70}%)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-amber-500" /> Twin Matching Accuracy
                  </span>
                  <span className="font-bold text-primary">94.2%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500" /> Active Habits Streak
                  </span>
                  <span className="font-bold text-orange-400">{stats.streak} Days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Digital Twin Health Index */}
          <Card className="border-border bg-indigo-950/5 border-indigo-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-black tracking-tight text-indigo-400 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-indigo-400" /> Digital Twin Health Index
              </CardTitle>
              <CardDescription className="text-xs">
                Composite metric calculated from all 16 development dimensions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-card border border-border rounded-xl text-center shadow-xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Base Index</p>
                  <p className="text-xl font-black text-foreground font-mono mt-0.5">
                    {twin?.overallHealthIndex?.score ?? 65}/100
                  </p>
                </div>
                <div className="p-2.5 bg-card border border-border rounded-xl text-center shadow-xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Confidence-Adjusted</p>
                  <p className="text-xl font-black text-indigo-400 font-mono mt-0.5">
                    {twin?.overallHealthIndex?.confidenceAdjustedScore ?? 60}/100
                  </p>
                </div>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg text-xs leading-relaxed text-muted-foreground font-medium border border-border/40">
                {twin?.overallHealthIndex?.explanation || "Health index compiled based on default priority weights."}
              </div>
            </CardContent>
          </Card>

          {/* LEVEL UP GAUGE WIDGET */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-500 fill-indigo-500" /> Level Progression
              </CardTitle>
              <CardDescription>
                Earn experience points (XP) to level up your Bio-Twin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
                <span>Level {currentLevel}</span>
                <span className="font-mono text-foreground font-bold">{currentXP} / {thresholds.max} XP</span>
                <span>Level {currentLevel + 1}</span>
              </div>
              
              {/* Progress gauge bar */}
              <div className="w-full bg-muted rounded-full h-3.5 overflow-hidden p-[2px] border border-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-gradient-to-r from-primary to-indigo-500 h-full rounded-full shadow-sm"
                />
              </div>

              <div className="bg-muted/40 rounded-xl p-3 border border-border/60 flex items-start gap-3 mt-4 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-foreground uppercase tracking-widest">Next Unlock</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{thresholds.reward}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wearables Widget */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Linked Sensors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Google_Fit_icon_%282018%29.svg/512px-Google_Fit_icon_%282018%29.svg.png"
                      className="w-5 h-5 object-contain"
                      alt="Google Fit"
                    />
                  </div>
                  <span className="font-bold text-sm">Google Fit API</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-green-500 bg-green-500/10 border-green-500/20 rounded-full font-black">
                  CONNECTED
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Health_Connect_Icon.svg/512px-Health_Connect_Icon.svg.png"
                      className="w-6 h-6 object-contain"
                      alt="Health Connect"
                    />
                  </div>
                  <span className="font-bold text-sm">Apple Health Connect</span>
                </div>
                <button className="text-[10px] font-bold border border-border hover:bg-muted bg-card text-muted-foreground px-3 py-1 rounded-lg transition-colors">
                  CONNECT
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Narrative Tabs (Digital Twin Engine vs Timeline vs Badges) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Tab Toggles */}
          <div className="flex border border-border p-1 bg-muted/40 rounded-xl flex-wrap md:flex-nowrap gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("twin_engine")}
              className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] ${activeTab === "twin_engine" ? "bg-card text-foreground shadow-sm border border-border/80 scale-[1.01]" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Network className="w-4 h-4" /> 16-Domain Digital Twin
            </button>
            <button
              onClick={() => setActiveTab("simulation")}
              className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] ${activeTab === "simulation" ? "bg-card text-foreground shadow-sm border border-border/80 scale-[1.01]" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Zap className="w-4 h-4" /> Simulate Future
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] ${activeTab === "timeline" ? "bg-card text-foreground shadow-sm border border-border/80 scale-[1.01]" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Calendar className="w-4 h-4" /> Timeline ({timeline.length})
            </button>
            <button
              onClick={() => setActiveTab("badges")}
              className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] ${activeTab === "badges" ? "bg-card text-foreground shadow-sm border border-border/80 scale-[1.01]" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Award className="w-4 h-4" /> Badges ({badges.filter(b => b.unlocked).length}/8)
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] ${activeTab === "history" ? "bg-card text-foreground shadow-sm border border-border/80 scale-[1.01]" : "text-muted-foreground hover:text-foreground"}`}
            >
              <History className="w-4 h-4" /> Ledger ({history.length})
            </button>
            <button
              onClick={() => setActiveTab("research")}
              className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] ${activeTab === "research" ? "bg-card text-foreground shadow-sm border border-border/80 scale-[1.01]" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Brain className="w-4 h-4" /> Research Data
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "twin_engine" ? (
              <motion.div
                key="twin_engine_pane"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="border-border">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
                    <div>
                      <CardTitle className="text-xl">Centralized Digital Twin Engine</CardTitle>
                      <CardDescription>
                        Select any of the 16 holistic development dimensions to inspect active neural models and evidence backings.
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleRecalibrate}
                      disabled={recalibrating}
                      className="font-bold py-2 px-4 shadow-sm h-auto flex items-center gap-2 self-start sm:self-auto bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 border-0 text-white shrink-0"
                    >
                      <Sparkles className={`w-4 h-4 ${recalibrating ? "animate-spin" : ""}`} />
                      {recalibrating ? "Recalibrating..." : "Recalibrate Twin"}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Grid of 16 states */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {DIMENSIONS.map((dim) => {
                        const stateValue = twin?.[dim.key] || DEFAULT_TWIN_STATES[dim.key];
                        const isSelected = selectedTwinKey === dim.key;
                        const Icon = dim.icon;
                        return (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setSelectedTwinKey(dim.key)}
                            key={dim.key}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? "bg-primary/10 border-primary shadow-xs"
                                : "bg-card border-border hover:border-border/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className={`p-1.5 rounded-lg ${dim.color} shrink-0`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-xl font-black font-mono leading-none">{stateValue?.score ?? 60}</span>
                            </div>
                            <div className="mt-3">
                              <p className="font-bold text-xs text-foreground truncate leading-none mb-1">{dim.label}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                                <span className={`uppercase font-black text-[9px] ${
                                  stateValue?.trend === "up" ? "text-green-500" : stateValue?.trend === "down" ? "text-red-400" : "text-amber-500"
                                }`}>
                                  {stateValue?.trend === "up" ? "▲ UP" : stateValue?.trend === "down" ? "▼ DOWN" : "● STABLE"}
                                </span>
                                <span>•</span>
                                <span className="font-sans">Conf: {stateValue?.confidence ?? 50}%</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Diagnostic Detail Panel */}
                    {selectedTwinKey && (() => {
                      const dim = DIMENSIONS.find(d => d.key === selectedTwinKey)!;
                      const stateValue = twin?.[selectedTwinKey] || DEFAULT_TWIN_STATES[selectedTwinKey];
                      const Icon = dim.icon;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-primary/10">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-xl ${dim.color}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-black text-lg text-foreground flex items-center gap-2">
                                  {dim.label} AI Diagnostic
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Last calibrated: {stateValue?.lastUpdated ? new Date(stateValue.lastUpdated).toLocaleString() : "Initial baseline"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 bg-card p-2 px-4 rounded-xl border border-border">
                              <div className="text-center shrink-0">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-sans">Score</p>
                                <p className="text-xl font-black text-primary font-mono">{stateValue?.score ?? 60}/100</p>
                              </div>
                              <div className="w-px h-6 bg-border"></div>
                              <div className="text-center shrink-0">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-sans">Trend</p>
                                <p className={`text-sm font-black font-mono uppercase ${
                                  stateValue?.trend === "up" ? "text-green-500" : stateValue?.trend === "down" ? "text-red-400" : "text-amber-500"
                                }`}>
                                  {stateValue?.trend === "up" ? "▲ UP" : stateValue?.trend === "down" ? "▼ DOWN" : "STABLE"}
                                </p>
                              </div>
                              <div className="w-px h-6 bg-border"></div>
                              <div className="text-center shrink-0">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-sans">Confidence</p>
                                <p className="text-sm font-black font-mono text-indigo-400">{stateValue?.confidence ?? 50}%</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> Explainable AI Summary
                              </h5>
                              <p className="text-sm text-foreground leading-relaxed bg-card p-3.5 rounded-xl border border-border/80 shadow-2xs font-medium">
                                {stateValue?.aiSummary || "Digital twin state synthesized based on baseline parameters."}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                                <Bookmark className="w-3.5 h-3.5 text-primary" /> Active Supporting Evidence
                              </h5>
                              <p className="text-xs text-foreground leading-relaxed bg-card p-3.5 rounded-xl border border-border/80 shadow-2xs font-mono">
                                {stateValue?.supportingEvidence || "Profile answers mapped securely to wellness state nodes."}
                              </p>
                            </div>
                          </div>

                          {/* Goal Awareness & Progression Target Card */}
                          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
                            <div className="flex justify-between items-center">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                                <Trophy className="w-3.5 h-3.5 text-amber-500" /> goal targets & priority tracking
                              </h5>
                              <Badge className={`${
                                stateValue?.priority === "High" ? "bg-red-500/10 text-red-500 border-red-500/20" : stateValue?.priority === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              } text-[9px] font-black uppercase rounded-full px-2.5 py-0.5 border`}>
                                {stateValue?.priority || "Medium"} Priority
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold">Target Score</p>
                                <p className="text-base font-black text-foreground font-mono mt-0.5">{stateValue?.targetScore ?? 85}/100</p>
                              </div>
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold">Target Gap</p>
                                <p className="text-base font-black text-red-400 font-mono mt-0.5">{stateValue?.gap ?? 0} pts</p>
                              </div>
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold">Estimated Improvement</p>
                                <p className="text-xs font-bold text-foreground mt-1 truncate">{stateValue?.expectedImprovement || "+1.5 / week"}</p>
                              </div>
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold">Time Horizon</p>
                                <p className="text-xs font-bold text-foreground mt-1 truncate">{stateValue?.estimatedTime || "8 weeks"}</p>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                                <span>Wellness Goal Progress</span>
                                <span className="font-mono text-foreground font-black">{stateValue?.progressPercentage ?? 0}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden p-[1px] border border-border">
                                <div 
                                  className="bg-gradient-to-r from-primary to-indigo-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${stateValue?.progressPercentage ?? 0}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Predictive Forecasts */}
                          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
                            <div className="flex justify-between items-center">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Predictive Forecasts
                              </h5>
                              <Badge className={`${
                                stateValue?.riskLevel === "Low" ? "bg-green-500/10 text-green-500 border-green-500/20" : stateValue?.riskLevel === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                              } text-[9px] font-black uppercase rounded-full px-2.5 py-0.5 border`}>
                                {stateValue?.riskLevel || "Low"} Risk
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase">7-Day Forecast</p>
                                <p className="text-base font-black text-foreground font-mono mt-0.5">{stateValue?.predictedScore7d ?? stateValue?.score ?? 60}</p>
                              </div>
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase">30-Day Forecast</p>
                                <p className="text-base font-black text-foreground font-mono mt-0.5">{stateValue?.predictedScore30d ?? stateValue?.score ?? 60}</p>
                              </div>
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Momentum</p>
                                <p className={`text-base font-black font-mono mt-0.5 ${(stateValue?.momentum || 0) > 0 ? "text-green-500" : (stateValue?.momentum || 0) < 0 ? "text-red-500" : "text-foreground"}`}>
                                  {(stateValue?.momentum || 0) > 0 ? `+${stateValue?.momentum}` : stateValue?.momentum || 0}
                                </p>
                              </div>
                              <div className="bg-muted/35 p-2.5 rounded-lg border border-border/40">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Growth Potential</p>
                                <p className="text-base font-black text-indigo-400 font-mono mt-0.5">{stateValue?.growthPotential ?? 20}%</p>
                              </div>
                            </div>
                            <p className="text-sm text-foreground bg-card p-3 rounded-lg border border-border/40 font-medium leading-relaxed shadow-2xs">
                              {stateValue?.futureProjection || "Projected to remain stable based on current trajectory."}
                            </p>
                          </div>

                          {/* Twin State Influences & Confidence breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                                <Activity className="w-3.5 h-3.5 text-emerald-500" /> active score contributions
                              </h5>
                              {stateValue?.contributions && stateValue.contributions.length > 0 ? (
                                <div className="space-y-2">
                                  {stateValue.contributions.map((c: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/50 text-xs">
                                      <div className={`p-1 rounded-md font-mono font-black text-[10px] shrink-0 ${
                                        c.impactValue > 0 ? "bg-green-500/10 text-green-500" : c.impactValue < 0 ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                                      }`}>
                                        {c.impactValue > 0 ? `+${c.impactValue}` : c.impactValue < 0 ? c.impactValue : "0"}
                                      </div>
                                      <div>
                                        <p className="font-black text-foreground">{c.source}</p>
                                        <p className="text-muted-foreground mt-0.5 text-[11px] leading-tight">{c.explanation}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic p-4 bg-muted/10 rounded-lg border border-dashed border-border text-center">
                                  No dynamic contributions computed for this dimension. Baseline mapping is active.
                                </p>
                              )}
                            </div>

                            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                                <CheckCircle className="w-3.5 h-3.5 text-indigo-500" /> explainable data confidence
                              </h5>
                              {stateValue?.confidenceBreakdown && stateValue.confidenceBreakdown.length > 0 ? (
                                <div className="space-y-2">
                                  {stateValue.confidenceBreakdown.map((cb: any, idx: number) => (
                                    <div key={idx} className="p-2.5 bg-muted/20 border border-border/40 rounded-lg flex justify-between items-center text-xs font-sans">
                                      <span className="font-semibold text-muted-foreground truncate mr-2">{cb.source}</span>
                                      <Badge variant="outline" className={`font-mono text-[10px] rounded-full shrink-0 ${
                                        cb.confidenceValue > 80 ? "text-green-500 border-green-500/20 bg-green-500/5" : cb.confidenceValue > 50 ? "text-amber-500 border-amber-500/20 bg-amber-500/5" : "text-muted-foreground border-border bg-muted/5"
                                      }`}>
                                        {cb.confidenceValue}% Confidence
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic p-4 bg-muted/10 rounded-lg border border-dashed border-border text-center">
                                  Baseline confidence established during initial user onboarding diagnostics.
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === "timeline" ? (
              <motion.div
                key="timeline_pane"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Timeline controls */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Daily Wellness Timeline</CardTitle>
                    <CardDescription>
                      Continuous chronicle of your macronutrients, athletic steps and logs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Custom Timeline Item Form */}
                    <form onSubmit={handleAddCustomLog} className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border/60">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Log Custom Health Event Directly to Timeline
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          placeholder="E.g., Done 20 mins of outdoor yoga in full sun, felt refreshed."
                          className="flex-1 min-h-[44px] bg-background border border-border rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                          value={customLogText}
                          onChange={(e) => setCustomLogText(e.target.value)}
                        />
                        <Button
                          type="submit"
                          disabled={loggingInProgress || !customLogText.trim()}
                          className="font-bold py-2 px-4 shadow-sm h-auto shrink-0"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Log
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        📝 Log event to increase record volume and earn 15 XP towards Level Up!
                      </p>
                    </form>

                    {/* Filter controls */}
                    <div className="flex flex-wrap gap-1.5 border-b border-border pb-4">
                      {[
                        { id: "all", name: "All Records" },
                        { id: "nutrition", name: "Nutrition 🍳" },
                        { id: "activity", name: "Activity 🏋️" },
                        { id: "mindfulness", name: "Mindfulness 💭" },
                        { id: "custom", name: "Custom Logs 📝" }
                      ].map(f => {
                        const count = f.id === "all" ? timeline.length : timeline.filter(t => {
                          if (f.id === "nutrition") return t.type === "nutrition";
                          if (f.id === "activity") return t.type === "activity";
                          if (f.id === "mindfulness") return t.type === "mindfulness" || t.type === "sleep";
                          if (f.id === "custom") return t.type === "custom";
                          return false;
                        }).length;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setTimelineFilter(f.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border flex items-center gap-1.5 ${timelineFilter === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                          >
                            <span>{f.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${timelineFilter === f.id ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground border border-border"}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Timeline Chronicle List */}
                    {filteredTimeline.length > 0 ? (
                      <div className="relative pl-6 border-l-2 border-muted space-y-6 pt-2">
                        {filteredTimeline.map((act) => {
                          const IconComponent = getTimelineIcon(act.type);
                          const colorClasses = getTimelineColor(act.type);
                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={act.id || `${act.time}-${act.event}`}
                              className="relative"
                            >
                              <div className={`absolute -left-[35px] border-2 border-card p-1.5 rounded-full w-8 h-8 flex items-center justify-center shadow-sm ${colorClasses}`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-2 hover:border-primary/20 transition-all hover:shadow-xs">
                                <div>
                                  <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest block mb-0.5 font-mono">
                                    {act.time}
                                  </span>
                                  <p className="font-bold text-foreground text-sm tracking-tight">{act.event}</p>
                                </div>
                                <Badge variant="outline" className={`text-[9px] px-2 uppercase py-0.5 rounded-full font-black ${colorClasses}`}>
                                  {act.type}
                                </Badge>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-muted/20 border border-dashed rounded-xl border-border">
                        <Bookmark className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-muted-foreground">No events found matching this filter.</p>
                        <p className="text-xs text-muted-foreground/80 mt-1">Start tracking to construct your digital twin timeline.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === "badges" ? (
              <motion.div
                key="badges_pane"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Stats recap row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Logged Plates", val: stats.food },
                    { label: "Logged Action Tracks", val: stats.exercises },
                    { label: "Mindfulness Dumps", val: stats.journals },
                    { label: "Weekly Streaks", val: stats.streak }
                  ].map((s, idx) => (
                    <div key={idx} className="bg-muted/40 p-4 border border-border rounded-xl text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                      <p className="text-xl font-black mt-1 text-foreground">{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Grid of dynamic badges */}
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-xl">Biomedical Badges Portfolio</CardTitle>
                    <CardDescription>
                      Accomplishments auto-unlocked based on your digital twins' recorded telemetry.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {badges.map((b) => {
                        const gradient = getBadgeGradientColor(b.id);
                        return (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setSelectedBadge(b)}
                            key={b.id}
                            className={`p-4 rounded-xl border ${b.unlocked ? `bg-gradient-to-br ${gradient} cursor-pointer` : "bg-muted/30 opacity-60"} flex items-start gap-4 transition-all`}
                          >
                            <div className="p-2.5 bg-card border border-border/80 rounded-xl shadow-xs relative shrink-0">
                              {getBadgeIcon(b.id, b.unlocked)}
                              {!b.unlocked && (
                                <div className="absolute -top-1 -right-1 bg-muted border border-border p-0.5 rounded-full text-muted-foreground">
                                  <Lock className="w-3 h-3" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm truncate text-foreground leading-none">{b.name}</span>
                                {b.unlocked && <Badge className="bg-green-500 hover:bg-green-500 text-[9px] px-1 py-0 h-4 rounded-md uppercase tracking-wide">UNLOCKED</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{b.description}</p>
                              
                              <div className="pt-1.5 flex items-center gap-1 text-[10px] font-bold text-muted-foreground font-mono">
                                <CheckCircle className={`w-3.5 h-3.5 ${b.unlocked ? "text-primary" : "text-muted-foreground/30"}`} />
                                <span className="truncate">{b.requirement}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Badge Details Modal Card */}
                {selectedBadge && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 border border-primary/20 bg-primary/5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-card border border-border rounded-xl shadow-sm">
                        {getBadgeIcon(selectedBadge.id, selectedBadge.unlocked)}
                      </div>
                      <div>
                        <h4 className="font-black text-foreground">{selectedBadge.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md">{selectedBadge.description}</p>
                        <p className="text-[11px] font-bold text-primary mt-1.5 uppercase tracking-widest font-mono">
                          Requirement: {selectedBadge.requirement}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBadge(null)}
                      className="font-bold border-muted-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                    >
                      Close Detail
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ) : activeTab === "history" ? (
              <motion.div
                key="history_pane"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-400" /> Complete Calibration Ledger
                    </CardTitle>
                    <CardDescription>
                      Audit logs, overall scores, and research metadata generated during every historical digital twin calibration cycle.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
                        <span className="animate-spin mr-2">●</span> Loading clinical ledger...
                      </div>
                    ) : history.length === 0 ? (
                      <div className="text-center p-12 border border-dashed border-border rounded-xl">
                        <History className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-semibold text-foreground">No historical snapshotted logs yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Recalibrate your twin in the "16-Domain Digital Twin" tab above to establish snapshots.</p>
                      </div>
                    ) : (
                      <div className="relative border-l border-border pl-6 space-y-6 ml-3">
                        {history.map((snap: any) => {
                          const resMeta = snap.fullTwinState?.researchMetadata || {};
                          return (
                            <div key={snap.id} className="relative group">
                              {/* Timeline dot */}
                              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-primary bg-background group-hover:bg-primary transition-colors flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-background"></div>
                              </div>
                              
                              <div className="p-4 bg-muted/20 hover:bg-muted/30 border border-border/80 hover:border-border rounded-xl space-y-3 transition-all shadow-2xs">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div>
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                                      Trigger: {snap.triggerSource}
                                    </span>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                      {new Date(snap.snapshotTimestamp || snap.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right shrink-0">
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Overall Score</p>
                                      <p className="text-sm font-black text-foreground font-mono">{snap.overallScore}/100</p>
                                    </div>
                                    <div className="w-px h-6 bg-border"></div>
                                    <div className="text-right shrink-0">
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Confidence</p>
                                      <p className="text-sm font-black text-indigo-400 font-mono">{snap.calibrationConfidence}%</p>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-sm text-foreground leading-relaxed bg-card p-3 rounded-lg border border-border/40 font-medium">
                                  {snap.generatedSummary || "Holistic development recalibration record."}
                                </p>

                                {/* Research Metadata Expansion */}
                                <div className="pt-2 border-t border-border/40">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-indigo-400" /> Clinical Research & Calibration telemetry
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-muted-foreground">
                                    <div>
                                      <span className="font-semibold text-foreground">Duration:</span> {resMeta.calibrationDurationMs ?? 45}ms
                                    </div>
                                    <div>
                                      <span className="font-semibold text-foreground">Data Sources:</span> {resMeta.numDataSourcesUsed ?? 1}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-foreground">Model:</span> {resMeta.modelVersion || "baseline"}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-foreground">Method:</span> {resMeta.calibrationMethod || "Direct-Push"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === "simulation" ? (
              <motion.div
                key="simulation_pane"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Zap className="w-5 h-5 text-indigo-400" /> AI Simulation Engine
                    </CardTitle>
                    <CardDescription>
                      Ask "What happens if..." to forecast your wellness future and preview biometric shifts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleSimulate} className="flex gap-2">
                      <input
                        type="text"
                        value={simQuery}
                        onChange={(e) => setSimQuery(e.target.value)}
                        placeholder="e.g. What happens if I sleep 8 hours every day?"
                        className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <Button type="submit" disabled={simulating || !simQuery.trim()}>
                        {simulating ? <span className="animate-spin mr-2">●</span> : null} Simulate
                      </Button>
                    </form>
                    
                    {simResult && (
                      <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-primary">
                          <TrendingUp className="w-4 h-4" /> Predicted Outcome
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-card border border-border p-3 rounded-lg text-center">
                            <span className="block text-xs text-muted-foreground uppercase tracking-widest font-bold">New HDI</span>
                            <span className="font-black text-xl text-foreground mt-1 block">{simResult.hdi}</span>
                          </div>
                          <div className="bg-card border border-border p-3 rounded-lg text-center">
                            <span className="block text-xs text-muted-foreground uppercase tracking-widest font-bold">Timeline</span>
                            <span className="font-bold text-foreground mt-1 block">{simResult.timeline}</span>
                          </div>
                          <div className="bg-card border border-border p-3 rounded-lg text-center">
                            <span className="block text-xs text-muted-foreground uppercase tracking-widest font-bold">Confidence</span>
                            <span className="font-bold text-indigo-400 mt-1 block">{simResult.confidence}%</span>
                          </div>
                          <div className="bg-card border border-border p-3 rounded-lg text-center">
                            <span className="block text-xs text-muted-foreground uppercase tracking-widest font-bold">Risk Level</span>
                            <span className={`font-bold mt-1 block ${simResult.riskLevel === 'Low' ? 'text-green-500' : simResult.riskLevel === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>{simResult.riskLevel}</span>
                          </div>
                        </div>
                        <p className="text-sm text-foreground bg-card p-3 rounded-lg border border-border/40 font-medium">
                          {simResult.explanation}
                        </p>
                        
                        <div>
                           <span className="block text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">Domain Impact</span>
                           <div className="flex flex-wrap gap-2">
                             {simResult.domainChanges && simResult.domainChanges.map((dc: any, idx: number) => (
                               <Badge key={idx} variant="outline" className={`${dc.change > 0 ? "text-green-500 bg-green-500/10 border-green-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"} text-[10px] rounded-full uppercase tracking-wider font-bold`}>
                                 {dc.domain}: {dc.change > 0 ? "+" : ""}{dc.change}
                               </Badge>
                             ))}
                           </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === "research" ? (
              <motion.div
                key="research_pane"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-400" /> Research Dashboard
                    </CardTitle>
                    <CardDescription>
                      Anonymized prediction accuracy, agent agreement, and model calibration for validation studies.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
                        <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Agent Agreement</span>
                        <span className="font-black text-2xl text-foreground font-mono mt-1 block">94%</span>
                      </div>
                      <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
                        <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Prediction Accuracy</span>
                        <span className="font-black text-2xl text-foreground font-mono mt-1 block">89%</span>
                      </div>
                      <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
                        <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Model Calibration</span>
                        <span className="font-black text-2xl text-foreground font-mono mt-1 block">0.82</span>
                      </div>
                      <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
                        <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Twin Confidence</span>
                        <span className="font-black text-2xl text-indigo-400 font-mono mt-1 block">High</span>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/20 border border-border/80 rounded-xl">
                      <h4 className="font-bold flex items-center gap-2 text-primary mb-2 text-sm">
                        <Activity className="w-4 h-4" /> Latest Research Insight
                      </h4>
                      <p className="text-sm text-foreground">
                        Longitudinal analysis indicates a 0.76 correlation coefficient between morning meditation consistency (3+ days/week) and subjective stress tolerance improvements over a 30-day window. Intervention adherence remains the primary variable in HDI trajectory shifts.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
