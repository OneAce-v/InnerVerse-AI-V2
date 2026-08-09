import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Settings, Calendar, Network, Target, BrainCircuit, Activity, LineChart, AlertTriangle, PlayCircle } from 'lucide-react';

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

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-8 h-8 text-primary animate-[spin_4s_linear_infinite]" /> Life Operating System
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Autonomous multi-agent intelligence coordinating your holistic development.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-full text-xs font-bold">
           <Activity className="w-3 h-3" /> System {data?.systemHealth}
        </div>
      </div>

      <div className="flex border border-border p-1 bg-muted/40 rounded-xl overflow-x-auto scrollbar-hide gap-1">
        <button onClick={() => setActiveTab("agents")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "agents" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Network className="w-4 h-4" /> Multi-Agent Core
        </button>
        <button onClick={() => setActiveTab("planner")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "planner" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Calendar className="w-4 h-4" /> Autonomous Planner
        </button>
        <button onClick={() => setActiveTab("decisions")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "decisions" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <BrainCircuit className="w-4 h-4" /> Proactive Decisions
        </button>
        <button onClick={() => setActiveTab("optimization")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "optimization" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Target className="w-4 h-4" /> System Optimization
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "agents" ? (
          <motion.div key="agents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Supervisor Status</p>
                 <p className="text-2xl font-black font-mono mt-1 text-primary">{data?.supervisorStatus}</p>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Active Agents</p>
                 <p className="text-2xl font-black font-mono mt-1 text-indigo-400">{data?.activeAgents}</p>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Pending Tasks</p>
                 <p className="text-2xl font-black font-mono mt-1 text-amber-500">{data?.pendingTasks}</p>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-center">
                 <Button variant="outline" size="sm" className="w-full font-bold border-dashed border-2"><PlayCircle className="w-4 h-4 mr-2" /> Force Sync</Button>
              </div>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="w-5 h-5 text-indigo-400" /> Specialized Intelligence Nodes</CardTitle>
                <CardDescription>Real-time telemetry from independent domain agents.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                 {data?.agents?.map((agent: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-card border border-border rounded-xl">
                       <div>
                          <h4 className="font-bold">{agent.name}</h4>
                          <span className="text-xs text-muted-foreground uppercase mt-1 block">Load: <span className={agent.load === 'high' ? 'text-amber-500 font-bold' : ''}>{agent.load}</span></span>
                       </div>
                       <Badge className={agent.status === 'analyzing' || agent.status === 'optimizing' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-muted text-muted-foreground border-border"}>
                         {agent.status.toUpperCase()}
                       </Badge>
                    </div>
                 ))}
              </CardContent>
            </Card>

          </motion.div>
        ) : activeTab === "planner" ? (
          <motion.div key="planner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
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
                             <div className="h-full bg-blue-500" style={{ width: `${data?.dailyPlan?.progress}%` }}></div>
                          </div>
                          <span className="font-mono text-sm font-bold">{data?.dailyPlan?.progress}%</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold uppercase text-muted-foreground">Next Up</p>
                       <p className="font-bold text-primary">{data?.dailyPlan?.nextTask}</p>
                    </div>
                 </div>

                 <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2.5 before:w-0.5 before:bg-border before:-z-10">
                    {data?.dailyPlan?.upcoming?.map((task: any, i: number) => (
                       <div key={i} className="flex gap-4 items-start relative mb-4 last:mb-0">
                          <div className="w-5 h-5 rounded-full bg-background border-2 border-primary shrink-0 mt-1"></div>
                          <div className="p-4 bg-card border border-border rounded-xl flex-1 flex justify-between items-center">
                             <div>
                               <h4 className="font-bold">{task.title}</h4>
                               <p className="text-xs uppercase text-muted-foreground font-bold mt-1">{task.type}</p>
                             </div>
                             <span className="font-mono text-sm font-bold">{task.time}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "decisions" ? (
          <motion.div key="decisions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-purple-500" /> Proactive Decision Log</CardTitle>
                <CardDescription>Interventions autonomously orchestrated by the supervisor agent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {data?.recentDecisions?.map((dec: any) => (
                    <div key={dec.id} className="p-4 bg-card border border-border rounded-xl">
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
                    </div>
                 ))}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="optimization" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-amber-500" /> Continuous Optimization</CardTitle>
                <CardDescription>Long-term system adjustments to improve your baseline scores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {data?.activeOptimizations?.map((opt: any, i: number) => (
                   <div key={i} className="p-4 bg-card border border-border rounded-xl">
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
                   </div>
                 ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
