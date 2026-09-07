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
import { Settings, Calendar, Network, Target, BrainCircuit, Activity, LineChart, PlayCircle } from 'lucide-react';

const TABS = [
  { id: 'agents', label: 'Multi-Agent Core', icon: Network },
  { id: 'planner', label: 'Autonomous Planner', icon: Calendar },
  { id: 'decisions', label: 'Proactive Decisions', icon: BrainCircuit },
  { id: 'optimization', label: 'System Optimization', icon: Target },
];

function SpinningSettingsIcon({ className }: { className?: string }) {
  return <Settings className={`${className} animate-[spin_4s_linear_infinite]`} />;
}

export default function LifeOS() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"agents" | "planner" | "decisions" | "optimization">("agents");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/lifeos/status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      await fetch("/api/digital-twin/recalibrate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
      <PageHeader
        icon={SpinningSettingsIcon}
        title="Life Operating System"
        description="Autonomous multi-agent intelligence coordinating your holistic development."
        action={
          <div className="flex items-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-full text-xs font-bold">
             <Activity className="w-3 h-3" /> System {data?.systemHealth}
          </div>
        }
      />

      <SectionTabs tabs={TABS} value={activeTab} onChange={(id) => setActiveTab(id as any)} layoutId="lifeos-tab" />

      <AnimatePresence mode="wait">
        {activeTab === "agents" ? (
          <motion.div key="agents" variants={tabPanel} initial="hidden" animate="visible" exit="exit" className="space-y-6">

            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div variants={staggerItem} className="p-4 bg-muted/30 border border-border rounded-xl">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Supervisor Status</p>
                 <p className="text-2xl font-black font-mono mt-1 text-primary">{data?.supervisorStatus}</p>
              </motion.div>
              <motion.div variants={staggerItem} className="p-4 bg-muted/30 border border-border rounded-xl">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Active Agents</p>
                 <p className="text-2xl font-black font-mono mt-1 text-indigo-400">{data?.activeAgents}</p>
              </motion.div>
              <motion.div variants={staggerItem} className="p-4 bg-muted/30 border border-border rounded-xl">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Pending Tasks</p>
                 <p className="text-2xl font-black font-mono mt-1 text-amber-500">{data?.pendingTasks}</p>
              </motion.div>
              <motion.div variants={staggerItem} className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-center">
                 <Button onClick={handleForceSync} disabled={syncing} variant="outline" size="sm" className="w-full font-bold border-dashed border-2"><PlayCircle className="w-4 h-4 mr-2" /> {syncing ? "Syncing..." : "Force Sync"}</Button>
              </motion.div>
            </motion.div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="w-5 h-5 text-indigo-400" /> Specialized Intelligence Nodes</CardTitle>
                <CardDescription>Real-time telemetry from independent domain agents.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                 <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                 {data?.agents?.map((agent: any, i: number) => (
                    <motion.div key={i} variants={staggerItem} className="flex justify-between items-center p-4 bg-card border border-border rounded-xl">
                       <div>
                          <h4 className="font-bold">{agent.name}</h4>
                          <span className="text-xs text-muted-foreground uppercase mt-1 block">Load: <span className={agent.load === 'high' ? 'text-amber-500 font-bold' : ''}>{agent.load}</span></span>
                       </div>
                       <Badge className={agent.status === 'analyzing' || agent.status === 'optimizing' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-muted text-muted-foreground border-border"}>
                         {agent.status.toUpperCase()}
                       </Badge>
                    </motion.div>
                 ))}
                 </motion.div>
              </CardContent>
            </Card>

          </motion.div>
        ) : activeTab === "planner" ? (
          <motion.div key="planner" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /> Autonomous Daily Planner</CardTitle>
                <CardDescription>Dynamically generated schedules based on real-time agent consensus.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="mb-6 flex justify-between items-center bg-muted/40 p-4 rounded-xl border border-border">
                    <div>
                       <p className="text-xs font-bold uppercase text-muted-foreground">Daily Progress</p>
                       <div className="flex items-center gap-3 mt-1">
                          <div className="h-2 w-32 bg-border rounded-full overflow-hidden">
                             <motion.div
                               className="h-full bg-blue-500"
                               initial={{ width: 0 }}
                               animate={{ width: `${data?.dailyPlan?.progress || 0}%` }}
                               transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                             />
                          </div>
                          <span className="font-mono text-sm font-bold">{data?.dailyPlan?.progress}%</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold uppercase text-muted-foreground">Next Up</p>
                       <p className="font-bold text-primary">{data?.dailyPlan?.nextTask}</p>
                    </div>
                 </div>

                 {(!data?.dailyPlan?.upcoming || data.dailyPlan.upcoming.length === 0) ? (
                   <EmptyState icon={Calendar} title="Nothing scheduled today" description="Tasks from your orchestrator's autonomous planner will appear here." />
                 ) : (
                 <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2.5 before:w-0.5 before:bg-border before:-z-10">
                    {data?.dailyPlan?.upcoming?.map((task: any, i: number) => (
                       <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-4 items-start relative mb-4 last:mb-0">
                          <div className="w-5 h-5 rounded-full bg-background border-2 border-primary shrink-0 mt-1"></div>
                          <div className="p-4 bg-card border border-border rounded-xl flex-1 flex justify-between items-center">
                             <div>
                               <h4 className="font-bold">{task.title}</h4>
                               <p className="text-xs uppercase text-muted-foreground font-bold mt-1">{task.type}</p>
                             </div>
                             <span className="font-mono text-sm font-bold">{task.time}</span>
                          </div>
                       </motion.div>
                    ))}
                 </div>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "decisions" ? (
          <motion.div key="decisions" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-purple-500" /> Proactive Decision Log</CardTitle>
                <CardDescription>Interventions autonomously orchestrated by the supervisor agent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {(!data?.recentDecisions || data.recentDecisions.length === 0) ? (
                   <EmptyState icon={BrainCircuit} title="No decisions logged yet" description="As specialist agents generate recommendations, the supervisor's decisions will appear here." />
                 ) : (
                 <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                 {data?.recentDecisions?.map((dec: any) => (
                    <motion.div key={dec.id} variants={staggerItem} className="p-4 bg-card border border-border rounded-xl">
                       <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="uppercase text-[10px]">{dec.topic}</Badge>
                          <span className="text-xs text-muted-foreground font-mono">{dec.time}</span>
                       </div>
                       <h4 className="font-bold text-sm mb-3">{dec.recommendation}</h4>
                       <div className="flex justify-between items-center pt-3 border-t border-border/50">
                          <div className="flex -space-x-2">
                             {dec.agentsInvolved.map((a: string, j: number) => (
                               <div key={j} className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[8px] font-bold shadow-sm" title={a}>
                                  {a.charAt(0)}
                               </div>
                             ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Confidence</span>
                            <span className="font-mono font-bold text-sm text-green-500">{dec.confidence}%</span>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 </motion.div>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="optimization" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-amber-500" /> Continuous Optimization</CardTitle>
                <CardDescription>Long-term system adjustments to improve your baseline scores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {(!data?.activeOptimizations || data.activeOptimizations.length === 0) ? (
                   <EmptyState icon={Target} title="No active optimizations" description="Once your Digital Twin identifies a gap, the strategy to close it will appear here." />
                 ) : (
                 <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                 {data?.activeOptimizations?.map((opt: any, i: number) => (
                   <motion.div key={i} variants={staggerItem} className="p-4 bg-card border border-border rounded-xl">
                      <div className="flex justify-between items-center mb-3">
                         <h4 className="font-bold flex items-center gap-2"><LineChart className="w-4 h-4 text-amber-500" /> {opt.dimension} Optimization</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                         <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-center">
                            <span className="block text-[10px] uppercase font-bold text-muted-foreground">Current</span>
                            <span className="font-mono text-xl">{opt.currentScore}</span>
                         </div>
                         <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-center">
                            <span className="block text-[10px] uppercase font-bold text-muted-foreground">Target</span>
                            <span className="font-mono text-xl text-amber-500">{opt.targetScore}</span>
                         </div>
                      </div>

                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                         <strong className="block text-[10px] uppercase text-amber-600/80 mb-1">Active Strategy</strong>
                         {opt.strategy}
                      </div>
                   </motion.div>
                 ))}
                 </motion.div>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
