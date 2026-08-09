import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.tsx";
import { useLanguage } from "../LanguageContext.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Progress } from "../components/ui/progress.tsx";
import { Input } from "../components/ui/input.tsx";
import {
  Brain,
  Heart,
  Activity,
  Target,
  Zap,
  ChevronRight,
  Search,
  Info,
  ChevronDown,
  CheckCircle2,
  TrendingUp,
  Moon,
  Dumbbell,
  Apple,
  Sparkles,
  X,
  Sliders,
  Volume2,
  Smile,
  Meh,
  Frown,
  Flame,
  Network,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router";

const mockWeeklyData = [
  { name: "Mon", hdi: 70 },
  { name: "Tue", hdi: 75 },
  { name: "Wed", hdi: 73 },
  { name: "Thu", hdi: 78 },
  { name: "Fri", hdi: 80 },
  { name: "Sat", hdi: 84 },
  { name: "Sun", hdi: 85 },
];

export default function Dashboard() {
  const { getToken, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [omnibarResponse, setOmnibarResponse] = useState("");
  const [omnibarLoading, setOmnibarLoading] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Progressive disclosure states
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Proactive Briefings & Recommendations from Multi-Agent Supervisor
  const [briefings, setBriefings] = useState<any>(null);
  const [loadingBriefings, setLoadingBriefings] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [activeBriefingTab, setActiveBriefingTab] = useState<"daily" | "weekly" | "monthly">("daily");

  // Wellness Score Simulator states
  const [showExplanation, setShowExplanation] = useState(false);
  const [simSleep, setSimSleep] = useState(7.5);
  const [simStress, setSimStress] = useState(4);
  const [simHydration, setSimHydration] = useState(6);
  const [simActiveMinutes, setSimActiveMinutes] = useState(30);

  // Evening Routine Wind-down states
  const [showEveningRoutine, setShowEveningRoutine] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"idle" | "inhale" | "hold" | "exhale" | "hold2">("idle");
  const [breathingSecs, setBreathingSecs] = useState(4);
  const [breathingCycle, setBreathingCycle] = useState(0);
  const [reflectionText, setReflectionText] = useState("");
  const [routineStage, setRoutineStage] = useState<"breathing" | "journal" | "summary">("breathing");
  const [savingReflection, setSavingReflection] = useState(false);
  const [routineMood, setRoutineMood] = useState<string>("neutral");

  // Breeding interval effect
  useEffect(() => {
    if (breathingPhase === "idle") {
      setBreathingSecs(4);
      return;
    }
    const interval = setInterval(() => {
      setBreathingSecs((prev) => {
        if (prev <= 1) {
          // Switch phase
          if (breathingPhase === "inhale") {
            setBreathingPhase("hold");
            return 4;
          } else if (breathingPhase === "hold") {
            setBreathingPhase("exhale");
            return 4;
          } else if (breathingPhase === "exhale") {
            setBreathingPhase("hold2");
            return 4;
          } else if (breathingPhase === "hold2") {
            setBreathingPhase("inhale");
            setBreathingCycle((c) => c + 1);
            return 4;
          }
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [breathingPhase]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setOmnibarResponse("");
      return;
    }

    setOmnibarLoading(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/omnibar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: searchQuery }),
        });
        const data = await res.json();
        setOmnibarResponse(data.answer);
      } catch (e) {
        console.error(e);
      } finally {
        setOmnibarLoading(false);
      }
    }, 800);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, getToken]);

  const [quests, setQuests] = useState([
    {
      id: 1,
      name: "10 Min Box Breathing",
      status: "pending",
      desc: "Regulate nervous system",
    },
    {
      id: 2,
      name: "Upper Body Workout",
      status: "pending",
      desc: "Based on recovery state",
    },
    {
      id: 3,
      name: "Log First Meal",
      status: "pending",
      desc: "You have not logged meals today",
    },
  ]);

  const [showReward, setShowReward] = useState<string | null>(null);

  const toggleQuest = async (id: number) => {
    const quest = quests.find((q) => q.id === id);
    if (!quest) return;

    if (quest.status === "pending") {
      try {
        const token = await getToken();
        await fetch("/api/quests/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questId: id, xpGain: 50, coinsGain: 10 }),
        });
      } catch (e) {
        console.error("Failed to sync quest completion", e);
      }

      // Trigger reward animation
      setShowReward(`+50 XP for ${quest.name}!`);
      setTimeout(() => setShowReward(null), 3000);
      setProfile((prev: any) => ({ ...prev, coins: (prev?.coins || 0) + 10 }));
    }

    setQuests((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, status: q.status === "completed" ? "pending" : "completed" }
          : q,
      ),
    );
  };

  const fetchData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileRes.json();
      setProfile(profileData.profile);

      if (!profileData.profile) {
        navigate("/onboarding");
        return;
      }

      // Fetch proactive supervisor briefings in background
      setLoadingBriefings(true);
      fetch("/api/briefings", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.briefing) setBriefings(data.briefing);
          setLoadingBriefings(false);
        })
        .catch((err) => {
          console.error("Failed to fetch briefings:", err);
          setLoadingBriefings(false);
        });

      // Fetch specialized multi-agent recommendations
      setLoadingRecs(true);
      fetch("/api/recommendations", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.recommendations) setRecommendations(data.recommendations);
          setLoadingRecs(false);
        })
        .catch((err) => {
          console.error("Failed to fetch recommendations:", err);
          setLoadingRecs(false);
        });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">
        <Brain className="w-8 h-8 mr-2 animate-spin" /> Gathering Insights...
      </div>
    );

  let hdiScore = 82; // Base mock score
  if (profile) {
    if (profile.stressLevel) hdiScore -= (profile.stressLevel - 5) * 2;
    if (profile.sleepQuality === "Excellent") hdiScore += 8;
    if (profile.sleepQuality === "Poor") hdiScore -= 8;
    if (
      profile.activityLevel === "Very Active" ||
      profile.activityLevel === "Extremely Active"
    )
      hdiScore += 8;
    hdiScore = Math.max(0, Math.min(100, hdiScore));
  }

  const streakDays = profile?.streakDays || 12;
  const progressPercent = 74;

  const toggleMetric = (metricId: string) => {
    setExpandedMetric((prev) => (prev === metricId ? null : metricId));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-8 pb-12 relative"
    >
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed bottom-20 right-8 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            {showReward}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Intelligent Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="text"
          placeholder="Ask InnerVerse AI any question... (e.g. 'Why did my score drop?', 'What should I eat?')"
          className="pl-12 py-6 text-base bg-card/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm hover:bg-card/80 transition-colors backdrop-blur-sm rounded-2xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-2 w-full bg-card rounded-xl border border-border shadow-xl p-5 z-50"
          >
            <div className="flex items-center gap-2 text-primary font-medium mb-3">
              <Sparkles
                className={`w-4 h-4 ${omnibarLoading ? "animate-pulse text-secondary" : ""}`}
              />
              {omnibarLoading
                ? "InnerVerse AI is thinking..."
                : "InnerVerse Insight"}
            </div>
            {omnibarLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">
                Analyzing your historical data and current biometrics...
              </p>
            ) : (
              <p className="text-sm md:text-base leading-relaxed text-foreground">
                {omnibarResponse}
              </p>
            )}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: AI Summary & Snapshot */}
        <div className="lg:col-span-7 space-y-8">
          {/* Autonomous Wellness OS Briefing Panel */}
          <Card className="border-border bg-gradient-to-r from-slate-900 to-indigo-950 text-white overflow-hidden relative shadow-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/25 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-300 tracking-wider uppercase">
                  <Network className="w-4 h-4 text-indigo-400 animate-pulse" /> Autonomous Wellness OS Briefing
                </div>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 bg-yellow-400/5 text-[9px] uppercase tracking-wider font-bold">
                  PROACTIVE INSIGHTS
                </Badge>
              </div>

              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                {(["daily", "weekly", "monthly"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveBriefingTab(tab)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all ${
                      activeBriefingTab === tab
                        ? "bg-white/10 text-white border border-white/20 shadow-xs"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {tab} Review
                  </button>
                ))}
              </div>

              {loadingBriefings ? (
                <div className="h-28 flex items-center justify-center text-xs text-indigo-300/60 animate-pulse font-mono">
                  <Brain className="w-4 h-4 mr-2 animate-spin" /> Supervisor compiling proactive briefing...
                </div>
              ) : briefings && briefings[activeBriefingTab] ? (
                <div className="space-y-3">
                  <p className="text-xs md:text-sm leading-relaxed text-indigo-100 font-medium whitespace-pre-line bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner">
                    {briefings[activeBriefingTab]}
                  </p>
                  <p className="text-[10px] text-indigo-300/60 text-right font-mono italic">
                    Coordinated by Supervisor Agent via Fitness, Nutrition, Sleep, and Mental specialists.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center text-xs text-indigo-200/60 leading-relaxed font-sans">
                  No active {activeBriefingTab} briefing compiled yet. Log details or trigger a recalibration in the <span className="font-bold text-white">Digital Twin</span> tab to activate the multi-agent orchestration team!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main AI Summary Card */}
          <Card className="border-border bg-gradient-to-br from-card to-card/50 overflow-hidden relative shadow-sm border-primary/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-bold text-primary tracking-wider uppercase">
                <Sparkles className="w-4 h-4" /> {t("dash.title", "Your InnerVerse")} — {t("dash.scoreSub", "AI Insights")}
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-medium leading-tight">
                  Hello, {user?.displayName?.split(" ")[0] || "User"}.
                  <br />
                  <span className="text-muted-foreground text-sm font-normal block mt-1">
                    {t("dash.subtitle", "Holistic biological model calibration dashboard.")}
                  </span>
                </h2>
              </div>

              {/* Dynamic Insight Feed */}
              <div className="space-y-4 mt-6">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Supervisor Agentic Recommendations
                </h3>

                {loadingRecs ? (
                  <div className="h-32 flex items-center justify-center text-xs text-muted-foreground animate-pulse font-mono border border-dashed border-border rounded-xl">
                    <Brain className="w-4 h-4 mr-2 animate-spin text-primary" /> Multi-Agent team collaborating on recommendations...
                  </div>
                ) : recommendations.length > 0 ? (
                  recommendations.map((rec) => {
                    let details: any = {};
                    try {
                      details = typeof rec.content === "string" ? JSON.parse(rec.content) : rec.content || {};
                    } catch (e) {
                      details = {};
                    }

                    // Map agentType/type to style & icon
                    const typeLower = (rec.type || "").toLowerCase();
                    const isFitness = typeLower.includes("fitness") || typeLower.includes("exercise");
                    const isNutrition = typeLower.includes("nutrition");
                    const isSleep = typeLower.includes("sleep") || typeLower.includes("recovery");
                    
                    const recIcon = isFitness ? (
                      <Dumbbell className="w-4 h-4 text-emerald-500" />
                    ) : isNutrition ? (
                      <Flame className="w-4 h-4 text-amber-500" />
                    ) : isSleep ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Brain className="w-4 h-4 text-purple-400" />
                    );

                    const recColor = isFitness ? (
                      "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                    ) : isNutrition ? (
                      "border-amber-500/20 bg-amber-500/5 text-amber-500"
                    ) : isSleep ? (
                      "border-indigo-500/20 bg-indigo-500/5 text-indigo-400"
                    ) : (
                      "border-purple-500/20 bg-purple-500/5 text-purple-400"
                    );

                    return (
                      <motion.div
                        key={rec.id}
                        whileHover={{ scale: 1.01 }}
                        className="p-4 rounded-xl bg-card border border-border shadow-xs hover:border-primary/30 hover:shadow-md transition-all flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {recIcon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${recColor}`}>
                                  {rec.type || "Specialist Agent"}
                                </span>
                                {details.hdiImprovement && (
                                  <span className="text-[10px] font-mono text-green-500 font-bold">
                                    HDI Improvement: {details.hdiImprovement}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-sm tracking-tight text-foreground mt-1.5">
                                {rec.title}
                              </h4>
                            </div>
                          </div>
                          {details.confidenceScore && (
                            <Badge variant="outline" className="font-mono text-[9px] text-indigo-400 border-indigo-500/25 shrink-0">
                              {details.confidenceScore}% Conf
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground leading-relaxed pl-11 space-y-2">
                          <div className="font-medium text-foreground bg-muted/45 p-2.5 rounded-lg border border-border/40">
                            <strong className="text-primary text-[10px] font-bold uppercase tracking-wider block mb-0.5">Clinical Rationale:</strong>
                            {details.reason || rec.content || "Assessment initialized from digital twin parameters."}
                          </div>

                          {/* Collapsible XAI Specs */}
                          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/40 text-[11px] space-y-1.5 font-mono">
                            {details.evidence && (
                              <p>
                                <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px]">Scientific Evidence:</span> {details.evidence}
                              </p>
                            )}
                            {details.expectedBenefit && (
                              <p>
                                <span className="text-green-500 font-bold uppercase tracking-wider text-[9px]">Expected Benefit:</span> {details.expectedBenefit}
                              </p>
                            )}
                            {details.riskFactors && (
                              <p>
                                <span className="text-red-400 font-bold uppercase tracking-wider text-[9px]">Risk Factors:</span> {details.riskFactors}
                              </p>
                            )}
                            {details.alternatives && (
                              <p>
                                <span className="text-amber-500 font-bold uppercase tracking-wider text-[9px]">Somatic Alternative:</span> {details.alternatives}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-6 bg-muted/30 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground leading-relaxed">
                    No active agent recommendations generated yet. Log more parameters or run a recalibration on the <span className="font-bold text-foreground">Digital Twin</span> page to trigger the collaborative agentic council!
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  Powered by:{" "}
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    InnerVerse Agentic OS
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-primary hover:bg-primary/5 rounded-lg"
                  onClick={() => setShowExplanation(true)}
                >
                  View Explanation <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Snapshot Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight">
              Progress Snapshot
            </h3>
            <span className="text-sm text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
              {streakDays} Day Streak 🔥
            </span>
          </div>

          {/* Smart Expandable Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fitness Card */}
            <Card
              className={`border-border cursor-pointer transition-all ${expandedMetric === "fitness" ? "ring-1 ring-primary shadow-md bg-card/80" : "hover:bg-muted/30 bg-card/50"}`}
              onClick={() => toggleMetric("fitness")}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <Dumbbell className="w-5 h-5 text-secondary" />
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMetric === "fitness" ? "rotate-180" : ""}`}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">
                    Fitness
                  </p>
                  <p className="text-2xl font-black">
                    82
                    <span className="text-base font-normal text-muted-foreground">
                      /100
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sleep Card */}
            <Card
              className={`border-border cursor-pointer transition-all ${expandedMetric === "sleep" ? "ring-1 ring-primary shadow-md bg-card/80" : "hover:bg-muted/30 bg-card/50"}`}
              onClick={() => toggleMetric("sleep")}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMetric === "sleep" ? "rotate-180" : ""}`}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">
                    Recovery
                  </p>
                  <p className="text-2xl font-black">
                    94
                    <span className="text-base font-normal text-muted-foreground">
                      /100
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Nutrition Card */}
            <Card
              className={`border-border cursor-pointer transition-all ${expandedMetric === "nutrition" ? "ring-1 ring-primary shadow-md bg-card/80" : "hover:bg-muted/30 bg-card/50"}`}
              onClick={() => toggleMetric("nutrition")}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <Apple className="w-5 h-5 text-green-500" />
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMetric === "nutrition" ? "rotate-180" : ""}`}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">
                    Nutrition
                  </p>
                  <p className="text-2xl font-black">
                    68
                    <span className="text-base font-normal text-muted-foreground">
                      /100
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deep Analytics Expansion Area */}
          <AnimatePresence>
            {expandedMetric && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-border bg-card/80">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-bold capitalize">
                        {expandedMetric} Details
                      </h4>
                      <Button variant="outline" size="sm">
                        Open Full Report <TrendingUp className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                    {/* Minimalist Chart placeholder */}
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mockWeeklyData}>
                          <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={["dataMin - 5", "dataMax + 5"]}
                            hide
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "var(--color-card)",
                              borderColor: "var(--color-border)",
                              borderRadius: "8px",
                            }}
                            itemStyle={{ color: "var(--color-primary)" }}
                            cursor={{
                              stroke: "var(--color-border)",
                              strokeWidth: 1,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="hdi"
                            stroke={
                              expandedMetric === "fitness"
                                ? "var(--color-secondary)"
                                : expandedMetric === "sleep"
                                  ? "#818cf8"
                                  : "#34d399"
                            }
                            strokeWidth={4}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Weekly Average
                        </p>
                        <p className="font-semibold">
                          {expandedMetric === "fitness"
                            ? "4 Days/Wk"
                            : expandedMetric === "sleep"
                              ? "6.8 Hrs"
                              : "1.8k Cal"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trend</p>
                        <p className="font-semibold text-green-500 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> +12%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Goal Alignment
                        </p>
                        <p className="font-semibold">On Track</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Ring & Quests */}
        <div className="lg:col-span-5 space-y-8">
          {/* Wellness Ring Module */}
          <Card className="border-border bg-card/30 backdrop-blur-sm border-none shadow-none">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                {/* Background SVG Circle */}
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="var(--color-muted)"
                    strokeWidth="8"
                    className="opacity-50"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="var(--color-primary)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * hdiScore) / 100}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                    Wellness
                  </span>
                  <span className="text-5xl font-black">{hdiScore}</span>
                </div>
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">Goal Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Daily Quests Layer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Daily Quests
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {quests.map((q) => (
                <div
                  key={q.id}
                  onClick={() => toggleQuest(q.id)}
                  className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${q.status === "completed" ? "bg-muted/20 border-border opacity-60" : "bg-card border-border hover:border-primary/50 shadow-sm cursor-pointer"}`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${q.status === "completed" ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground group-hover:border-primary"}`}
                    >
                      {q.status === "completed" && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-sm ${q.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                      >
                        {q.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              onClick={() => {
                setShowEveningRoutine(true);
                setRoutineStage("breathing");
                setBreathingPhase("idle");
                setBreathingSecs(4);
                setBreathingCycle(0);
                setReflectionText("");
              }}
              className="w-full rounded-xl py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all font-bold"
            >
              Start Evening Routine
            </Button>
          </div>
        </div>
      </div>

      {/* --- EXPLANATION & INTERACTIVE SIMULATOR MODAL --- */}
      <AnimatePresence>
        {showExplanation && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Sliders className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold">Wellness Score Formulation</h3>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => setShowExplanation(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your **Wellness Score** (Holistic Health Index) is calculated via weightings of your biometric inputs and lifestyle tracking records. Use the simulator below to forecast how improving different health metrics will optimize your daily readiness.
                  </p>
                </div>

                {/* Simulated Score Gauge */}
                <div className="bg-muted/30 border border-border rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-1">Simulated Score Forecast</h4>
                    <p className="text-sm text-muted-foreground">Adjust the biometric sliders below to recalculate.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex flex-col items-center justify-center relative bg-background shrink-0">
                      <div className="absolute inset-2 rounded-full border border-dashed border-primary/30"></div>
                      <span className="text-2xl font-black text-primary">{Math.max(30, Math.min(100, Math.round((simSleep / 10) * 40 + (10 - simStress) * 3 + (simHydration / 8) * 15 + (simActiveMinutes / 60) * 15)))}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">/100</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-secondary/10 text-secondary uppercase">
                        {Math.round((simSleep / 10) * 40 + (10 - simStress) * 3 + (simHydration / 8) * 15 + (simActiveMinutes / 60) * 15) >= 83 ? "Optimal State" : Math.round((simSleep / 10) * 40 + (10 - simStress) * 3 + (simHydration / 8) * 15 + (simActiveMinutes / 60) * 15) >= 70 ? "Balanced State" : "Recovery Required"}
                      </span>
                      <p className="text-xs text-muted-foreground">Forecasted increase: {Math.max(0, Math.round((simSleep / 10) * 40 + (10 - simStress) * 3 + (simHydration / 8) * 15 + (simActiveMinutes / 60) * 15) - hdiScore)}%</p>
                    </div>
                  </div>
                </div>

                {/* Interactive Sliders */}
                <div className="space-y-4">
                  {/* Sleep Duration */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold flex items-center gap-1.5"><Moon className="w-4 h-4 text-indigo-400" /> Sleep Duration</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-semibold">{simSleep} hrs (weighted 40%)</span>
                    </div>
                    <input 
                      type="range" 
                      min="4" 
                      max="10" 
                      step="0.5"
                      value={simSleep} 
                      onChange={(e) => setSimSleep(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Stress Level */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold flex items-center gap-1.5"><Brain className="w-4 h-4 text-purple-400" /> Stress Tolerance</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-semibold">Score: {10 - simStress}/10 (weighted 30%)</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      value={simStress} 
                      onChange={(e) => setSimStress(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                      <span>High Stress (10)</span>
                      <span>Relaxed (1)</span>
                    </div>
                  </div>

                  {/* Daily Hydration */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold flex items-center gap-1.5"><Zap className="w-4 h-4 text-blue-400" /> Hydration</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-semibold">{simHydration} Glasses (weighted 15%)</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="12" 
                      step="1"
                      value={simHydration} 
                      onChange={(e) => setSimHydration(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Active Minutes */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold flex items-center gap-1.5"><Dumbbell className="w-4 h-4 text-secondary" /> Activity Level</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-semibold">{simActiveMinutes} Mins (weighted 15%)</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="120" 
                      step="5"
                      value={simActiveMinutes} 
                      onChange={(e) => setSimActiveMinutes(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 justify-end">
                  <Button variant="outline" className="w-full" onClick={() => {
                    setSimSleep(7.5);
                    setSimStress(4);
                    setSimHydration(6);
                    setSimActiveMinutes(30);
                  }}>
                    Reset Defaults
                  </Button>
                  <Button className="w-full gap-2 font-bold" onClick={() => {
                    setShowExplanation(false);
                    setShowReward(`Simulator insight captured! Try integrating these biometrics into your day.`);
                    setTimeout(() => setShowReward(null), 3000);
                  }}>
                    Apply Insights
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- GUIDED EVENING WIND-DOWN OVERLAY --- */}
      <AnimatePresence>
        {showEveningRoutine && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Moon className="w-6 h-6 animate-pulse" />
                  <div>
                    <h3 className="text-lg font-bold">Guided Bedtime Routine</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-mono">Stage: {routineStage}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={() => {
                  setBreathingPhase("idle");
                  setShowEveningRoutine(false);
                }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* STAGE 1: BREATHING */}
              {routineStage === "breathing" && (
                <div className="space-y-6 text-center py-6 flex-grow flex flex-col items-center justify-center">
                  <div>
                    <h4 className="text-xl font-bold">Nervous System Reset</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">Lower stress with Box Breathing to reduce heart rate variability before sleeping.</p>
                  </div>

                  {/* Interactive Visual Breathing Loop */}
                  <div className="relative w-44 h-44 flex items-center justify-center my-4">
                    <motion.div 
                      animate={{
                        scale: breathingPhase === "inhale" ? 1.4 : breathingPhase === "hold" ? 1.4 : breathingPhase === "exhale" ? 1.0 : 1.0,
                        backgroundColor: breathingPhase === "inhale" ? "rgba(129, 140, 248, 0.25)" : breathingPhase === "hold" ? "rgba(139, 92, 246, 0.25)" : "rgba(129, 140, 248, 0.1)"
                      }}
                      transition={{ duration: breathingPhase === "idle" ? 0 : 4, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full border-2 border-indigo-400/30 flex items-center justify-center"
                    />

                    {/* Central Text Panel */}
                    <div className="relative z-10 flex flex-col items-center justify-center select-none text-center">
                      <span className="text-lg font-black text-indigo-400 capitalize duration-300">
                        {breathingPhase === "idle" ? "Ready" : breathingPhase === "hold" ? "Hold" : breathingPhase === "hold2" ? "Ready" : breathingPhase}
                      </span>
                      <span className="text-4xl font-extrabold font-mono text-foreground mt-1">
                        {breathingPhase === "idle" ? "--" : breathingSecs}s
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2 bg-muted px-4 py-1.5 rounded-full font-semibold">
                    Cycles completed: {breathingCycle} / 4
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2 w-full pt-4">
                    {breathingPhase === "idle" ? (
                      <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold" onClick={() => setBreathingPhase("inhale")}>
                        Begin Guided Breathing (4 min)
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" className="flex-1" onClick={() => setBreathingPhase("idle")}>
                          Reset Step
                        </Button>
                        <Button className="flex-1 bg-primary text-primary-foreground font-bold" onClick={() => setRoutineStage("journal")}>
                          Next: Reflection
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* STAGE 2: REFLECTION */}
              {routineStage === "journal" && (
                <div className="space-y-6 flex-grow text-left">
                  <div>
                    <h4 className="text-xl font-bold">Mental Brain-Dump</h4>
                    <p className="text-xs text-muted-foreground mt-1">Unload your concerns so your brain doesn't process them while trying to sleep.</p>
                  </div>

                  {/* Mood Buttons */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">How does your mind feel right now?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Wired", val: "wired", icon: Frown, color: "hover:bg-red-500/10 hover:border-red-500/40 text-red-500" },
                        { label: "Anxious / Busy", val: "anxious", icon: Meh, color: "hover:bg-orange-500/10 hover:border-orange-500/40 text-orange-500" },
                        { label: "Calm / Clear", val: "calm", icon: Smile, color: "hover:bg-green-500/10 hover:border-green-500/40 text-green-500" }
                      ].map((item, id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setRoutineMood(item.val)}
                          className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-sm font-semibold ${routineMood === item.val ? "bg-primary/20 border-primary text-foreground" : "border-border bg-card/40 " + item.color}`}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Journal text box */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Type your thoughts (e.g., today's stress, tomorrow's tasks):</label>
                    <textarea 
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      placeholder="I can't stop thinking about tomorrow's presentation, but I am ready to rest..."
                      rows={4}
                      className="w-full bg-muted/30 border border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl p-3 text-sm resize-none outline-none text-foreground"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setRoutineStage("breathing")}>
                      Back
                    </Button>
                    <Button 
                      className="flex-1 font-bold gap-2" 
                      disabled={savingReflection || !reflectionText.trim()}
                      onClick={async () => {
                        setSavingReflection(true);
                        try {
                          const token = await getToken();
                          // Write to actual journal backend!
                          await fetch("/api/journal", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ content: `[Bedtime CheckIn Mood: ${routineMood}] ${reflectionText}`, date: new Date().toISOString() })
                          });
                          
                          // Award rewards! Sync quest completions
                          await fetch("/api/quests/complete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ questId: 1, xpGain: 30, coinsGain: 15 })
                          });

                          // Update profile locally if profile is ready
                          setProfile((prev: any) => ({
                            ...prev,
                            xp: (prev?.xp || 0) + 30,
                            coins: (prev?.coins || 0) + 15
                          }));

                          setRoutineStage("summary");
                        } catch (e) {
                          console.error("Bedtime routine submit failure:", e);
                          setRoutineStage("summary");
                        } finally {
                          setSavingReflection(false);
                        }
                      }}
                    >
                      {savingReflection ? "Analyzing Mood..." : "Save Routine & Sync"}
                    </Button>
                  </div>
                </div>
              )}

              {/* STAGE 3: REWARD SUMMARY */}
              {routineStage === "summary" && (
                <div className="space-y-6 text-center py-6 flex-grow flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-green-500/10 text-green-500 border border-green-500/30 rounded-full flex items-center justify-center text-3xl font-extrabold animate-bounce">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold">Goodnight & Rest Well</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">Your wind-down session is completed. Your reflections have been analyzed and logged to your journal.</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-4 max-w-md mx-auto space-y-2 text-sm text-indigo-400 font-bold w-full">
                    <p>✨ Rewards Awarded:</p>
                    <div className="flex justify-center gap-6 text-sm font-mono mt-1 text-foreground">
                      <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary fill-primary" /> +30 XP</span>
                      <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" /> +15 Coins</span>
                    </div>
                  </div>

                  <div className="pt-4 w-full">
                    <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold" onClick={() => setShowEveningRoutine(false)}>
                      Finish & Sleep
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
