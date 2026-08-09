import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Thermometer, MapPin, Wind, Sun, Battery, Activity, Calendar, History, Share2, Network, Smartphone, Bell, Flame, Watch, BrainCircuit } from 'lucide-react';

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

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="w-8 h-8 text-primary" /> Ambient Intelligence
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Your continuous context, life timeline, and semantic knowledge graph.
          </p>
        </div>
      </div>

      <div className="flex border border-border p-1 bg-muted/40 rounded-xl overflow-x-auto scrollbar-hide gap-1">
        <button
          onClick={() => setActiveTab("context")}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "context" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}
        >
          <MapPin className="w-4 h-4" /> Live Context
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "timeline" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}
        >
          <History className="w-4 h-4" /> Life Timeline
        </button>
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "knowledge" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Network className="w-4 h-4" /> Knowledge Graph
        </button>
        <button
          onClick={() => setActiveTab("memory")}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "memory" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}
        >
          <BrainCircuit className="w-4 h-4" /> Memory Engine
        </button>
        <button
          onClick={() => setActiveTab("wearables")}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "wearables" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Watch className="w-4 h-4" /> Wearables
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "notifications" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Bell className="w-4 h-4" /> Ambient Coaching
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "context" ? (
          <motion.div key="context" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        ) : activeTab === "timeline" ? (
          <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Life Timeline</CardTitle>
                <CardDescription>Chronological reconstruction of your habits and well-being.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {timeline.map((event, idx) => (
                    <div key={event.id} className="relative pl-6 pb-6 border-l border-border last:pb-0">
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "knowledge" ? (
          <motion.div key="knowledge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <motion.div key="memory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Memory Engine</CardTitle>
                <CardDescription>Long-term insights and preferences learned by Coach Nova over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {memoryBlocks.map(block => (
                    <div key={block.id} className="p-4 bg-muted/20 border border-border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{block.type}</Badge>
                        <span className="text-[10px] text-muted-foreground font-bold">Confidence: {block.confidence}%</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{block.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "wearables" ? (
          <motion.div key="wearables" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Wearable Intelligence</CardTitle>
                <CardDescription>Synchronize your biometric devices for high-resolution context.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wearables.map(device => (
                    <div key={device.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-border rounded-xl gap-4">
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Ambient Interventions</CardTitle>
                <CardDescription>Proactive coaching based on your real-time context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.map(note => (
                  <div key={note.id} className="bg-card border border-border p-4 rounded-xl space-y-2 relative overflow-hidden">
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
