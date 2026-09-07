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
import { Brain, FileText, FlaskConical, Target, Activity, Zap, ShieldAlert, LineChart, BookOpen, AlertTriangle } from 'lucide-react';

const TABS = [
  { id: 'explainable', label: 'Explainable AI', icon: Brain },
  { id: 'predictions', label: 'Predictions', icon: Target },
  { id: 'behavior', label: 'Behavior Patterns', icon: Activity },
  { id: 'interventions', label: 'Interventions', icon: Zap },
];

export default function Research() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"explainable" | "predictions" | "behavior" | "interventions">("explainable");
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
      const res = await fetch("/api/research/dashboard", {
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

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
      <PageHeader
        icon={FlaskConical}
        title="Research Intelligence"
        description="Explainable AI, predictive modeling, and longitudinal intervention tracking."
        action={<Button className="font-bold flex items-center gap-2"><LineChart className="w-4 h-4" /> Publication Export</Button>}
      />

      <SectionTabs tabs={TABS} value={activeTab} onChange={(id) => setActiveTab(id as any)} layoutId="research-tab" />

      <AnimatePresence mode="wait">
        {activeTab === "explainable" ? (
          <motion.div key="explainable" variants={tabPanel} initial="hidden" animate="visible" exit="exit" className="space-y-6">
            {(!data?.recommendations || data.recommendations.length === 0) ? (
              <EmptyState icon={Brain} title="No recommendations to explain yet" description="Generate recommendations from your Dashboard to see the full scientific reasoning behind them here." />
            ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {data?.recommendations?.map((rec: any) => (
              <motion.div key={rec.id} variants={staggerItem}>
              <Card className="border-border">
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    <div>
                       <Badge variant="outline" className="mb-2 uppercase text-[10px] tracking-wider text-muted-foreground bg-muted/50">{rec.dimension}</Badge>
                       <CardTitle className="text-xl">{rec.title}</CardTitle>
                    </div>
                    <div className="flex gap-4 text-right shrink-0">
                       <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-green-500" /> Confidence</span>
                          <span className="font-mono text-lg font-black text-green-500">{rec.confidence}%</span>
                       </div>
                       <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Uncertainty</span>
                          <span className="font-mono text-lg font-black text-amber-500">{rec.uncertainty}%</span>
                       </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <h4 className="font-bold flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-primary" /> Scientific Reasoning</h4>
                      <div className="space-y-3">
                         {rec.evidence.biological && (
                            <div className="p-3 bg-muted/30 border border-border rounded-lg text-sm">
                               <strong className="block text-xs uppercase text-muted-foreground mb-1">Biological</strong>
                               {rec.evidence.biological}
                            </div>
                         )}
                         {rec.evidence.psychological && (
                            <div className="p-3 bg-muted/30 border border-border rounded-lg text-sm">
                               <strong className="block text-xs uppercase text-muted-foreground mb-1">Psychological</strong>
                               {rec.evidence.psychological}
                            </div>
                         )}
                         {rec.evidence.nutritional && (
                            <div className="p-3 bg-muted/30 border border-border rounded-lg text-sm">
                               <strong className="block text-xs uppercase text-muted-foreground mb-1">Nutritional</strong>
                               {rec.evidence.nutritional}
                            </div>
                         )}
                      </div>
                      {rec.scientificSource && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background p-2 border border-border rounded-md mt-2">
                          <BookOpen className="w-3 h-3 shrink-0" />
                          <span>Source: {rec.scientificSource.title} ({rec.scientificSource.year})</span>
                        </div>
                      )}
                   </div>

                   <div className="space-y-4">
                      <h4 className="font-bold flex items-center gap-2 text-sm"><LineChart className="w-4 h-4 text-primary" /> Empirical Evidence</h4>
                      <div className="space-y-2">
                        <strong className="block text-xs uppercase text-green-500">Supporting Metrics</strong>
                        <ul className="space-y-1">
                           {rec.evidence.supportingMetrics.map((m: string, i: number) => (
                             <li key={i} className="text-sm flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:bg-green-500 before:rounded-full">{m}</li>
                           ))}
                        </ul>
                      </div>
                      {rec.evidence.conflictingMetrics && rec.evidence.conflictingMetrics.length > 0 && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-border">
                          <strong className="block text-xs uppercase text-red-400">Conflicting Data / Risks</strong>
                          <ul className="space-y-1">
                             {rec.evidence.conflictingMetrics.map((m: string, i: number) => (
                               <li key={i} className="text-sm flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:bg-red-400 before:rounded-full">{m}</li>
                             ))}
                          </ul>
                        </div>
                      )}
                   </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
            </motion.div>
            )}
          </motion.div>
        ) : activeTab === "predictions" ? (
          <motion.div key="predictions" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-indigo-400" /> Predictive Modeling</CardTitle>
                <CardDescription>Forward-looking forecasts driven by historical variance and recent behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {(!data?.predictions || data.predictions.length === 0) ? (
                   <EmptyState icon={Target} title="No predictions yet" description="Predictions are derived from your Digital Twin's gap-ranked dimensions once it has enough signal." />
                 ) : (
                 <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                 {data?.predictions?.map((pred: any, i: number) => (
                    <motion.div key={i} variants={staggerItem} className="p-4 bg-card border border-border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                       <div>
                          <p className="text-xs uppercase text-muted-foreground font-bold mb-1">{pred.timeframe}</p>
                          <h4 className="font-bold text-lg">{pred.dimension}</h4>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="text-right">
                             <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Forecast</p>
                             <span className="text-xl font-black font-mono">{pred.predictedValue}</span>
                          </div>
                          <div className="h-10 w-px bg-border"></div>
                          <div className="text-right">
                             <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Confidence</p>
                             <span className={`text-lg font-black font-mono ${pred.confidence > 80 ? 'text-green-500' : 'text-amber-500'}`}>{pred.confidence}%</span>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 </motion.div>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "behavior" ? (
          <motion.div key="behavior" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" /> Discovered Behavior Patterns</CardTitle>
                <CardDescription>Latent routines and triggers detected through correlation analysis.</CardDescription>
              </CardHeader>
              <CardContent>
                {(!data?.behaviorPatterns || data.behaviorPatterns.length === 0) ? (
                  <EmptyState icon={Activity} title="No patterns detected yet" description="Keep logging activity — recurring routines and triggers will surface here once detected." />
                ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {data?.behaviorPatterns?.map((pattern: any, i: number) => (
                    <motion.div key={i} variants={staggerItem} className="p-4 bg-card border border-border rounded-xl flex flex-col justify-between h-full gap-4">
                       <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm">{pattern.name}</h4>
                          <Badge variant="outline" className={pattern.type === 'positive' ? "border-green-500/30 text-green-500" : "border-red-400/30 text-red-400"}>
                            {pattern.type}
                          </Badge>
                       </div>
                       <div className="space-y-2 mt-2 pt-2 border-t border-border/50">
                          <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Trigger</span>
                             <span className="font-medium text-right max-w-[60%]">{pattern.trigger}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Frequency</span>
                             <span className="font-medium">{pattern.frequency}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Measurable Impact</span>
                             <span className={`font-bold ${pattern.type === 'positive' ? 'text-green-500' : 'text-red-400'}`}>{pattern.impact}</span>
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
          <motion.div key="interventions" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-purple-500" /> Intervention Effectiveness</CardTitle>
                <CardDescription>Evaluating the actual impact of adopted recommendations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {(!data?.interventions || data.interventions.length === 0) ? (
                   <EmptyState icon={Zap} title="No interventions tracked yet" description="Once you adopt a recommendation, its before/after impact will be measured here." />
                 ) : (
                 <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                 {data?.interventions?.map((inv: any, i: number) => (
                   <motion.div key={i} variants={staggerItem} className="p-4 bg-card border border-border rounded-xl">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                         <h4 className="font-bold">{inv.title}</h4>
                         <Badge className={inv.status === 'success' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                           {inv.status.toUpperCase()}
                         </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                         <div className="bg-muted/30 p-2 rounded-lg text-center border border-border/50">
                            <span className="block text-[10px] uppercase text-muted-foreground font-bold">Baseline</span>
                            <span className="text-lg font-mono">{inv.baseline}</span>
                         </div>
                         <div className="bg-muted/30 p-2 rounded-lg text-center border border-border/50">
                            <span className="block text-[10px] uppercase text-muted-foreground font-bold">Post</span>
                            <span className={`text-lg font-mono ${inv.post > inv.baseline ? 'text-green-500' : 'text-muted-foreground'}`}>{inv.post}</span>
                         </div>
                         <div className="bg-muted/30 p-2 rounded-lg text-center border border-border/50">
                            <span className="block text-[10px] uppercase text-muted-foreground font-bold">Adherence</span>
                            <span className={`text-lg font-mono ${inv.adherence >= 80 ? 'text-green-500' : 'text-amber-500'}`}>{inv.adherence}%</span>
                         </div>
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
