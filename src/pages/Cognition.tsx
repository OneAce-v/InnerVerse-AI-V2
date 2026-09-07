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
import { BrainCircuit, Database, Network, LineChart, Cpu, Lightbulb, Beaker, FileSpreadsheet } from 'lucide-react';

const TABS = [
  { id: 'meta', label: 'Meta Reasoning', icon: BrainCircuit },
  { id: 'memory', label: 'Cognitive Memory', icon: Database },
  { id: 'evolution', label: 'Twin Evolution', icon: Network },
  { id: 'research', label: 'A/B Testing', icon: Beaker },
];

export default function Cognition() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"meta" | "memory" | "evolution" | "research">("meta");
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
      const res = await fetch("/api/cognition", {
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

  const handleDesignExperiment = async () => {
    const hypothesis = window.prompt("What hypothesis do you want to test?");
    if (!hypothesis || !hypothesis.trim()) return;
    try {
      const token = await getToken();
      await fetch("/api/cognition/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hypothesis: hypothesis.trim() })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
      <PageHeader
        icon={Cpu}
        title="Cognitive Intelligence"
        description="Self-evolving architecture, meta-reasoning, and lifelong learning memory."
        action={<Button className="font-bold flex items-center gap-2"><LineChart className="w-4 h-4" /> View AI Audit Log</Button>}
      />

      <SectionTabs tabs={TABS} value={activeTab} onChange={(id) => setActiveTab(id as any)} layoutId="cognition-tab" />

      <AnimatePresence mode="wait">
        {activeTab === "meta" ? (
          <motion.div key="meta" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-indigo-400" /> Meta-Reasoning Engine</CardTitle>
                <CardDescription>AI reasoning about its own assumptions and predictions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <motion.div variants={staggerItem} className="p-4 bg-muted/20 border border-border rounded-xl">
                    <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Confidence</p>
                    <p className="text-3xl font-black font-mono text-indigo-400">{data?.metaReasoning?.confidenceScore}%</p>
                  </motion.div>
                  <motion.div variants={staggerItem} className="p-4 bg-muted/20 border border-border rounded-xl">
                    <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Corrections</p>
                    <p className="text-3xl font-black font-mono text-amber-500">{data?.metaReasoning?.correctedAssumptions}</p>
                  </motion.div>
                  <motion.div variants={staggerItem} className="p-4 bg-muted/20 border border-border rounded-xl">
                    <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Audits</p>
                    <p className="text-3xl font-black font-mono">{data?.metaReasoning?.decisionAudits}</p>
                  </motion.div>
                </motion.div>

                <div className="p-4 border border-indigo-500/20 bg-indigo-500/5 rounded-xl">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Recent Self-Correction</h4>
                  <p className="text-sm font-medium">{data?.metaReasoning?.recentSelfCorrection}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "memory" ? (
          <motion.div key="memory" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-green-500" /> Lifelong Cognitive Memory</CardTitle>
                <CardDescription>Continuous learning across working, semantic, and procedural states.</CardDescription>
              </CardHeader>
              <CardContent>
                {(!data?.memorySystem || data.memorySystem.length === 0) ? (
                  <EmptyState icon={Database} title="No memories consolidated yet" description="Journal entries, quest completions, and Digital Twin recalibrations build lasting memory here." />
                ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                  {data?.memorySystem?.map((mem: any, i: number) => (
                    <motion.div key={i} variants={staggerItem} className="flex justify-between items-center p-4 bg-card border border-border rounded-xl">
                      <div>
                        <h4 className="font-bold text-base flex items-center gap-2">{mem.type} Memory</h4>
                        <p className="text-xs text-muted-foreground mt-1">Updated {mem.lastUpdated}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-mono font-bold mr-4">{mem.count} nodes</span>
                        <Badge variant="outline">{mem.status}</Badge>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "evolution" ? (
          <motion.div key="evolution" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="w-5 h-5 text-blue-500" /> Digital Twin Evolution</CardTitle>
                <CardDescription>Forecasts and historical progression of your personal state.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">

                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                     <div className="flex items-center justify-center w-8 h-8 rounded-full border border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 text-xs font-bold text-primary">Now</div>
                     <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card">
                       <h4 className="font-bold text-primary mb-1">Current Baseline</h4>
                       <p className="text-sm text-muted-foreground">{data?.twinProjections?.currentBaseline}</p>
                     </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                     <div className="flex items-center justify-center w-8 h-8 rounded-full border border-amber-500/50 bg-amber-500/10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 text-xs font-bold text-amber-500">+30</div>
                     <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                       <h4 className="font-bold text-amber-500 mb-1">Forecast: 30 Days</h4>
                       <p className="text-sm font-medium mb-3">{data?.twinProjections?.forecast30Days}</p>
                       <div className="p-2 bg-background/50 rounded text-xs border border-amber-500/20">
                          <strong className="text-amber-500">Intervention:</strong> {data?.twinProjections?.suggestedIntervention}
                       </div>
                     </div>
                  </motion.div>

                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="research" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Beaker className="w-5 h-5 text-purple-500" /> Personal Research Platform</CardTitle>
                <CardDescription>A/B testing behavioral interventions for statistical significance.</CardDescription>
              </CardHeader>
              <CardContent>
                 {(!data?.researchExperiments || data.researchExperiments.length === 0) ? (
                   <EmptyState icon={Beaker} title="No experiments running" description="Design an experiment to test a hypothesis about your own habits and behavior." />
                 ) : (
                 <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                    {data?.researchExperiments?.map((exp: any) => (
                      <motion.div key={exp.id} variants={staggerItem} className="p-4 bg-card border border-border rounded-xl">
                         <div className="flex items-center justify-between mb-2">
                           <Badge className={exp.status === 'running' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-muted text-muted-foreground border-border"}>
                             {exp.status.toUpperCase()}
                           </Badge>
                           {exp.duration && <span className="text-xs text-muted-foreground font-mono">{exp.duration}</span>}
                         </div>
                         <h4 className="font-bold mb-3">{exp.hypothesis}</h4>

                         {exp.status === 'concluded' ? (
                           <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                             <span className="text-sm font-bold text-green-500">{exp.result}</span>
                             <span className="text-xs font-mono">P &lt; 0.05 (Sig: {exp.significance}%)</span>
                           </div>
                         ) : (
                           <div className="flex items-center gap-2 mt-2">
                              <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full w-1/2 animate-pulse"></div>
                              </div>
                              <span className="text-xs text-muted-foreground">Gathering data...</span>
                           </div>
                         )}
                      </motion.div>
                    ))}
                 </motion.div>
                 )}
                 <Button onClick={handleDesignExperiment} variant="outline" className="w-full border-dashed mt-4"><FileSpreadsheet className="w-4 h-4 mr-2" /> Design New Experiment</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
