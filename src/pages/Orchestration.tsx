import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { PageHeader } from '../components/ui/page-header.tsx';
import { SectionTabs } from '../components/ui/section-tabs.tsx';
import { EmptyState } from '../components/ui/empty-state.tsx';
import { PageLoader } from '../components/ui/skeleton.tsx';
import { tabPanel, staggerContainer, staggerItem } from '@/lib/motion';
import { Target, Compass, GitMerge, BrainCircuit, Play, BarChart, CalendarCheck, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

const TABS = [
  { id: 'missions', label: 'Missions', icon: Compass },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'planning', label: 'Planning', icon: CalendarCheck },
  { id: 'decision', label: 'Decisions', icon: GitMerge },
  { id: 'reviews', label: 'Reviews', icon: BarChart },
];

export default function Orchestration() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"missions" | "goals" | "planning" | "decision" | "reviews">("missions");

  const [missions, setMissions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [decisionQuery, setDecisionQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [decisionResult, setDecisionResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/orchestration", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.missions) setMissions(data.missions);
      if (data.goals) setGoals(data.goals);
      if (data.plans) setPlans(data.plans);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDefineMission = async () => {
    const title = window.prompt("Mission title:");
    if (!title || !title.trim()) return;
    const vision = window.prompt("Vision statement (optional):") || "";
    try {
      const token = await getToken();
      await fetch("/api/orchestration/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, vision })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteTask = async (planId: number) => {
    try {
      const token = await getToken();
      await fetch(`/api/orchestration/tasks/${planId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecisionAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionQuery.trim()) return;
    setAnalyzing(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/orchestration/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: decisionQuery })
      });
      const data = await res.json();
      if (data.decision) setDecisionResult(data.decision);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
      <PageHeader
        icon={Compass}
        title="Autonomous Life Orchestrator"
        description="Your Chief AI Architect for strategy, planning, execution, and long-term human development."
        action={<Button className="font-bold flex items-center gap-2"><Play className="w-4 h-4" /> Run Strategic Review</Button>}
      />

      <SectionTabs tabs={TABS} value={activeTab} onChange={(id) => setActiveTab(id as any)} layoutId="orchestration-tab" />

      <AnimatePresence mode="wait">
        {activeTab === "missions" ? (
          <motion.div key="missions" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Compass className="w-5 h-5 text-indigo-400" /> Life Missions</CardTitle>
                <CardDescription>Core pillars driving your long-term holistic development.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {missions.length === 0 && (
                  <EmptyState icon={Compass} title="No missions defined yet" description="Define a long-term mission to anchor your goals and daily plans." />
                )}
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {missions.map(mission => (
                    <motion.div key={mission.id} variants={staggerItem} className="p-4 bg-muted/20 border border-border rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-lg">{mission.title}</h3>
                         <Badge className="bg-primary/10 text-primary border-primary/20">Alignment: {mission.alignmentScore}%</Badge>
                      </div>
                      <p className="text-sm text-foreground mb-4">{mission.vision}</p>
                      <div className="flex gap-2">
                         <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setActiveTab("goals")}>View Goals</Button>
                         <Button size="sm" variant="outline" className="h-8 text-xs">Strategic Alignment Check</Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                <Button onClick={handleDefineMission} className="w-full border-dashed border-2 bg-transparent text-foreground hover:bg-muted/50" variant="outline">+ Define New Mission</Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "goals" ? (
          <motion.div key="goals" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-green-500" /> Goal Orchestration</CardTitle>
                <CardDescription>Hierarchical adaptive goals managed by the AI Supervisor.</CardDescription>
              </CardHeader>
              <CardContent>
                {goals.length === 0 ? (
                  <EmptyState icon={Target} title="No goals yet" description="Goals appear here once a mission generates them, or as you define your own." />
                ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {goals.map(goal => (
                    <motion.div key={goal.id} variants={staggerItem} className="flex flex-col md:flex-row justify-between md:items-center p-4 border border-border rounded-xl gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <Badge variant="outline" className="text-[10px] uppercase">{goal.domain}</Badge>
                           <Badge className={goal.status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground border-border"}>{goal.status}</Badge>
                        </div>
                        <h4 className="font-bold text-base">{goal.title}</h4>
                        <div className="flex items-center gap-4 mt-3">
                           <div className="flex-1 max-w-[200px]">
                              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                 <span>Progress</span>
                                 <span>{goal.progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                                <motion.div
                                  className="h-full bg-primary rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${goal.progress}%` }}
                                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                />
                              </div>
                           </div>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Target Date</p>
                         <p className="font-bold text-sm">{goal.target}</p>
                         <p className="text-[10px] uppercase font-bold text-muted-foreground mt-2">Priority</p>
                         <p className="font-black text-indigo-400">{goal.priority}/100</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "planning" ? (
          <motion.div key="planning" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-primary" /> Autonomous Planning</CardTitle>
                <CardDescription>Dynamically generated daily schedule based on goals, context, and recovery.</CardDescription>
              </CardHeader>
              <CardContent>
                {plans.length === 0 ? (
                  <EmptyState icon={CalendarCheck} title="Nothing scheduled" description="Your autonomous planner will populate today's schedule as goals and tasks are created." />
                ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {plans.map(plan => (
                    <motion.div key={plan.id} variants={staggerItem} layout className="relative pl-8 p-4 bg-card border border-border rounded-xl">
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500 rounded-l-xl"></div>
                      <div className="flex justify-between items-start">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                             <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                             <span className="text-xs font-bold font-mono">{plan.time}</span>
                             {plan.ai && <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-indigo-500/10 text-indigo-400 border-indigo-500/20"><BrainCircuit className="w-2.5 h-2.5 mr-1"/> AI Planned</Badge>}
                           </div>
                           <h4 className="font-bold">{plan.title}</h4>
                           <p className="text-xs text-muted-foreground mt-1">Reason: {plan.reason}</p>
                        </div>
                        <Button onClick={() => handleCompleteTask(plan.id)} variant="outline" size="sm" className="h-8">
                           <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Done
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                )}
                <Button variant="secondary" className="w-full mt-4"><GitMerge className="w-4 h-4 mr-2" /> Re-plan Schedule</Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "decision" ? (
          <motion.div key="decision" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitMerge className="w-5 h-5 text-amber-500" /> Decision Intelligence</CardTitle>
                <CardDescription>Simulated opportunity costs and multi-option analysis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <form onSubmit={handleDecisionAnalysis} className="flex gap-2">
                   <input
                     type="text"
                     value={decisionQuery}
                     onChange={(e) => setDecisionQuery(e.target.value)}
                     placeholder="e.g. Should I run a marathon next month?"
                     className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                   />
                   <Button type="submit" disabled={analyzing || !decisionQuery.trim()}>
                     {analyzing ? <span className="animate-spin mr-2">●</span> : null} Analyze
                   </Button>
                 </form>

                 <AnimatePresence>
                 {decisionResult && (
                   <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/20 border border-border rounded-xl p-4">
                      <h4 className="font-bold flex items-center gap-2 mb-4"><ShieldAlert className="w-4 h-4 text-amber-500" /> Strategic Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-card p-3 rounded-lg border border-green-500/30 shadow-xs">
                            <h5 className="text-xs font-bold uppercase text-green-500 mb-2">Option A: {decisionResult.optionA?.title || "Accept"}</h5>
                            <ul className="text-xs space-y-1 text-foreground">
                              {decisionResult.optionA?.pros?.map((p: string, i: number) => <li key={i} className="text-green-500">+ {p}</li>)}
                              {decisionResult.optionA?.cons?.map((c: string, i: number) => <li key={i} className="text-red-400">- {c}</li>)}
                            </ul>
                         </div>
                         <div className="bg-card p-3 rounded-lg border border-blue-500/30 shadow-xs">
                            <h5 className="text-xs font-bold uppercase text-blue-500 mb-2">Option B: {decisionResult.optionB?.title || "Decline"}</h5>
                            <ul className="text-xs space-y-1 text-foreground">
                              {decisionResult.optionB?.pros?.map((p: string, i: number) => <li key={i} className="text-blue-500">+ {p}</li>)}
                              {decisionResult.optionB?.cons?.map((c: string, i: number) => <li key={i} className="text-red-400">- {c}</li>)}
                            </ul>
                         </div>
                      </div>
                      <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                         <p className="text-xs font-bold text-indigo-400 mb-1">Supervisor AI Recommendation:</p>
                         <p className="text-sm font-medium">{decisionResult.recommendation}</p>
                      </div>
                   </motion.div>
                 )}
                 </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="reviews" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart className="w-5 h-5 text-blue-500" /> Strategic Reviews</CardTitle>
                <CardDescription>Automated insights from your behavioral trajectory.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    <div className="p-4 bg-card border border-border rounded-xl">
                       <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold">Weekly Performance Review</h4>
                          <Badge variant="outline">Last Week</Badge>
                       </div>
                       <p className="text-sm mb-3">Execution consistency was high (85%), but sleep quality degraded. The Planning Engine is automatically reducing exercise volume by 15% this week to prioritize nervous system recovery.</p>
                       <Button size="sm" variant="secondary" className="w-full text-xs">Read Full Report</Button>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
