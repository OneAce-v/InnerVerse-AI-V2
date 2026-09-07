import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { PageHeader } from '../components/ui/page-header.tsx';
import { SectionTabs } from '../components/ui/section-tabs.tsx';
import { PageLoader } from '../components/ui/skeleton.tsx';
import { tabPanel, staggerContainer, staggerItem } from '@/lib/motion';
import { MapPin, Wind, Sun, Battery, Activity, History, Share2, Network, Smartphone, Bell, Flame, Watch, BrainCircuit } from 'lucide-react';

const TABS = [
  { id: 'context', label: 'Live Context', icon: MapPin },
  { id: 'timeline', label: 'Life Timeline', icon: History },
  { id: 'knowledge', label: 'Knowledge Graph', icon: Network },
  { id: 'memory', label: 'Memory Engine', icon: BrainCircuit },
  { id: 'wearables', label: 'Wearables', icon: Watch },
  { id: 'notifications', label: 'Ambient Coaching', icon: Bell },
];

export default function Ambient() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"context" | "timeline" | "knowledge" | "notifications" | "wearables" | "memory">("context");

  const [ambientContext, setAmbientContext] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [knowledgeGraph, setKnowledgeGraph] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [wearables, setWearables] = useState<any[]>([]);
  const [memoryBlocks, setMemoryBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();

      setAmbientContext({
        location: "Home Office",
        weather: "Light Rain, 18°C",
        aqi: 45,
        deviceState: "Active",
        battery: "82% (Discharging)",
        hr: 68,
        hrv: 42,
        stress: "Low",
        productivitySession: true,
        calendarNext: "Team Standup in 45m"
      });

      setTimeline([
        { id: 1, type: "MEAL", title: "Breakfast: Oatmeal & Berries", time: "08:15 AM", impact: "+2" },
        { id: 2, type: "EXERCISE", title: "Morning Yoga (20m)", time: "07:30 AM", impact: "+5" },
        { id: 3, type: "MOOD", title: "Felt focused", time: "10:00 AM", impact: "0" }
      ]);

      setKnowledgeGraph({
        nodes: [
          { id: 1, label: "Morning Yoga", type: "HABIT" },
          { id: 2, label: "Stress Reduction", type: "GOAL" },
          { id: 3, label: "Sleep Quality", type: "METRIC" },
        ],
        edges: [
          { source: 1, target: 2, label: "SUPPORTS" },
          { source: 2, target: 3, label: "IMPROVES" }
        ]
      });

      setNotifications([
        { id: 1, title: "Weather Shift Detected", content: "Rain is expected this afternoon. Consider moving your run to now.", priority: "medium", benefit: "Avoid missed workout", time: "45m" },
        { id: 2, title: "Calendar Gap", content: "You have a 30m gap before your next meeting. Perfect time for a quick stretch.", priority: "low", benefit: "Reduce sitting fatigue", time: "10m" }
      ]);

      setWearables([
        { id: 'google_fit', name: 'Google Fit / Health Connect', connected: true, lastSync: '10 mins ago', data: ['Steps', 'Heart Rate', 'Calories'] },
        { id: 'apple_health', name: 'Apple Health', connected: false, lastSync: null, data: [] },
        { id: 'oura', name: 'Oura Ring', connected: true, lastSync: '2 hours ago', data: ['Sleep', 'Readiness', 'HRV'] },
      ]);

      setMemoryBlocks([
        { id: 1, type: 'PREFERENCE', content: 'User prefers morning workouts and responds poorly to HIIT when sleep is < 6h.', confidence: 95 },
        { id: 2, type: 'INTERVENTION_RESULT', content: 'Suggesting 10m meditation during afternoon calendar gaps has a 80% success rate.', confidence: 88 },
        { id: 3, type: 'RHYTHM', content: 'Deep work focus peaks between 9 AM and 11 AM.', confidence: 92 },
      ]);

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
        icon={Share2}
        title="Ambient Intelligence"
        description="Your continuous context, life timeline, and semantic knowledge graph."
      />

      <SectionTabs tabs={TABS} value={activeTab} onChange={(id) => setActiveTab(id as any)} layoutId="ambient-tab" />

      <AnimatePresence mode="wait">
        {activeTab === "context" ? (
          <motion.div key="context" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <motion.div variants={staggerItem}>
             <Card className="border-border">
               <CardHeader className="pb-3">
                 <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><MapPin className="w-4 h-4 text-primary" /> Location & Environment</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div>
                   <p className="text-2xl font-black">{ambientContext?.location}</p>
                   <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Sun className="w-4 h-4" /> {ambientContext?.weather}</p>
                 </div>
                 <div className="flex gap-4">
                   <div className="bg-muted/30 p-2 rounded-lg flex-1">
                     <p className="text-[10px] uppercase text-muted-foreground font-bold">AQI</p>
                     <p className="font-mono font-bold text-green-500">{ambientContext?.aqi} (Good)</p>
                   </div>
                   <div className="bg-muted/30 p-2 rounded-lg flex-1">
                     <p className="text-[10px] uppercase text-muted-foreground font-bold">Temp</p>
                     <p className="font-mono font-bold">{ambientContext?.weather.split(", ")[1]}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
             </motion.div>

             <motion.div variants={staggerItem}>
             <Card className="border-border">
               <CardHeader className="pb-3">
                 <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><Activity className="w-4 h-4 text-red-500" /> Wearable Telemetry</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] uppercase text-muted-foreground font-bold">Heart Rate</p>
                     <p className="text-2xl font-black font-mono flex items-baseline gap-1">{ambientContext?.hr} <span className="text-xs text-muted-foreground">bpm</span></p>
                   </div>
                   <div>
                     <p className="text-[10px] uppercase text-muted-foreground font-bold">HRV</p>
                     <p className="text-2xl font-black font-mono flex items-baseline gap-1">{ambientContext?.hrv} <span className="text-xs text-muted-foreground">ms</span></p>
                   </div>
                 </div>
                 <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg">
                    <p className="text-xs font-bold text-green-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Stress Level: {ambientContext?.stress}</p>
                 </div>
               </CardContent>
             </Card>
             </motion.div>

             <motion.div variants={staggerItem}>
             <Card className="border-border">
               <CardHeader className="pb-3">
                 <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><Smartphone className="w-4 h-4 text-indigo-400" /> Productivity & Device</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div>
                   <p className="text-[10px] uppercase text-muted-foreground font-bold">Calendar</p>
                   <p className="text-sm font-bold mt-1 bg-muted/40 p-2 rounded border border-border/50">{ambientContext?.calendarNext}</p>
                 </div>
                 <div className="flex gap-4">
                   <div>
                     <p className="text-[10px] uppercase text-muted-foreground font-bold">Device State</p>
                     <p className="font-bold text-sm mt-1">{ambientContext?.deviceState}</p>
                   </div>
                   <div>
                     <p className="text-[10px] uppercase text-muted-foreground font-bold">Battery</p>
                     <p className="font-bold text-sm mt-1 flex items-center gap-1"><Battery className="w-4 h-4" /> {ambientContext?.battery}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
             </motion.div>
          </motion.div>
          </motion.div>
        ) : activeTab === "timeline" ? (
          <motion.div key="timeline" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Life Timeline</CardTitle>
                <CardDescription>Chronological reconstruction of your habits and well-being.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {timeline.map((event, idx) => (
                    <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }} className="relative pl-6 pb-6 border-l border-border last:pb-0">
                      <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1">{event.type}</Badge>
                          <h4 className="font-bold">{event.title}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">{event.time}</span>
                          <span className={`text-xs font-bold ${event.impact.startsWith('+') ? 'text-green-500' : 'text-muted-foreground'}`}>HDI Impact {event.impact}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "knowledge" ? (
          <motion.div key="knowledge" variants={tabPanel} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border md:col-span-2">
              <CardHeader>
                <CardTitle>Personal Knowledge Graph</CardTitle>
                <CardDescription>How the AI connects your behaviors, goals, and outcomes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted/20 border border-border rounded-xl flex items-center justify-center p-4">
                   <div className="flex flex-col items-center gap-4">
                     <div className="flex items-center gap-12">
                       <div className="bg-card border-2 border-primary p-3 rounded-xl text-center shadow-md">
                         <span className="text-[10px] text-muted-foreground block font-bold uppercase">Habit</span>
                         <span className="font-bold">Morning Yoga</span>
                       </div>
                       <div className="flex flex-col items-center">
                         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background px-2 relative z-10">Supports</span>
                         <div className="h-0.5 w-24 bg-border -mt-2"></div>
                       </div>
                       <div className="bg-card border-2 border-indigo-400 p-3 rounded-xl text-center shadow-md">
                         <span className="text-[10px] text-muted-foreground block font-bold uppercase">Goal</span>
                         <span className="font-bold">Stress Reduction</span>
                       </div>
                     </div>
                     <div className="flex flex-col items-center">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background px-2 relative z-10">Improves</span>
                       <div className="w-0.5 h-12 bg-border -mt-2"></div>
                     </div>
                     <div className="bg-card border-2 border-green-500 p-3 rounded-xl text-center shadow-md">
                        <span className="text-[10px] text-muted-foreground block font-bold uppercase">Metric</span>
                        <span className="font-bold">Sleep Quality</span>
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "memory" ? (
          <motion.div key="memory" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Memory Engine</CardTitle>
                <CardDescription>Long-term insights and preferences learned by Coach Nova over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {memoryBlocks.map(block => (
                    <motion.div key={block.id} variants={staggerItem} className="p-4 bg-muted/20 border border-border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{block.type}</Badge>
                        <span className="text-[10px] text-muted-foreground font-bold">Confidence: {block.confidence}%</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{block.content}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "wearables" ? (
          <motion.div key="wearables" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Wearable Intelligence</CardTitle>
                <CardDescription>Synchronize your biometric devices for high-resolution context.</CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {wearables.map(device => (
                    <motion.div key={device.id} variants={staggerItem} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-border rounded-xl gap-4">
                      <div>
                        <h4 className="font-bold flex items-center gap-2">{device.name}</h4>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {device.data.length > 0 ? device.data.map((d: string) => (
                             <Badge key={d} variant="secondary" className="text-[10px] bg-muted/50 text-muted-foreground">{d}</Badge>
                          )) : (
                             <span className="text-xs text-muted-foreground">No data points synced</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {device.connected ? (
                           <div className="text-right">
                             <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">Connected</Badge>
                             <p className="text-[10px] text-muted-foreground mt-1 text-right">Synced: {device.lastSync}</p>
                           </div>
                        ) : (
                           <Button variant="outline" size="sm">Connect</Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="notifications" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Ambient Interventions</CardTitle>
                <CardDescription>Proactive coaching based on your real-time context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                {notifications.map(note => (
                  <motion.div key={note.id} variants={staggerItem} className="bg-card border border-border p-4 rounded-xl space-y-2 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${note.priority === 'high' ? 'bg-red-500' : note.priority === 'medium' ? 'bg-amber-500' : 'bg-primary'}`}></div>
                    <div className="flex justify-between items-start pl-2">
                      <h4 className="font-bold">{note.title}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{note.time}</Badge>
                    </div>
                    <p className="text-sm text-foreground pl-2">{note.content}</p>
                    <div className="pl-2 pt-2 border-t border-border/40 flex justify-between items-center mt-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1"><Flame className="w-3 h-3"/> Benefit: {note.benefit}</span>
                      <Button size="sm" variant="secondary" className="h-7 text-xs">Acknowledge</Button>
                    </div>
                  </motion.div>
                ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
