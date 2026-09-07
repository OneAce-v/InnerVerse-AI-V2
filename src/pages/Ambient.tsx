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
import WearablesSection from '../components/tracking/WearablesSection.tsx';
import { Activity, History, Network, Bell, BrainCircuit, Watch, HeartPulse, Sparkles, CheckCircle2 } from 'lucide-react';

const TABS = [
  { id: 'context', label: 'Live Snapshot', icon: Activity },
  { id: 'timeline', label: 'Life Timeline', icon: History },
  { id: 'knowledge', label: 'Knowledge Graph', icon: Network },
  { id: 'memory', label: 'Memory Engine', icon: BrainCircuit },
  { id: 'wearables', label: 'Wearables', icon: Watch },
  { id: 'notifications', label: 'Ambient Coaching', icon: Bell },
];

const notifTypeColor: Record<string, string> = {
  alert: 'bg-red-500',
  warning: 'bg-amber-500',
  recommendation: 'bg-primary',
  info: 'bg-primary',
};

export default function Ambient() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"context" | "timeline" | "knowledge" | "notifications" | "wearables" | "memory">("context");

  const [cognition, setCognition] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [wearableCount, setWearableCount] = useState({ connected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const [cognitionRes, timelineRes, notifsRes, wearablesRes] = await Promise.all([
        fetch("/api/cognition", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/timeline", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/wearables", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const cognitionData = await cognitionRes.json();
      const timelineData = await timelineRes.json();
      const notifsData = await notifsRes.json();
      const wearablesData = await wearablesRes.json();

      setCognition(cognitionData);
      if (timelineData.timeline) setTimeline(timelineData.timeline);
      if (notifsData.notifications) setNotifs(notifsData.notifications);
      if (wearablesData.connections) {
        setWearableCount({
          connected: wearablesData.connections.filter((c: any) => c.connected).length,
          total: wearablesData.connections.length,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (notificationId: number) => {
    setAcknowledging(notificationId);
    try {
      const token = await getToken();
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationId }),
      });
      setNotifs((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error(e);
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) return <PageLoader />;

  const unreadCount = notifs.filter((n) => !n.isRead).length;
  const latestEvent = timeline[0];

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
      <PageHeader
        icon={Activity}
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
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><HeartPulse className="w-4 h-4 text-primary" /> Digital Twin Pulse</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm font-bold text-foreground">{cognition?.twinProjections?.currentBaseline || "No calibration yet"}</p>
                    <div className="flex gap-4">
                      <div className="bg-muted/30 p-2 rounded-lg flex-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Confidence</p>
                        <p className="font-mono font-bold text-primary">{cognition?.metaReasoning?.confidenceScore ?? 0}%</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-lg flex-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Recalibrations</p>
                        <p className="font-mono font-bold">{cognition?.metaReasoning?.decisionAudits ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><History className="w-4 h-4 text-red-500" /> Latest Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestEvent ? (
                      <>
                        <Badge variant="outline" className="text-[10px]">{latestEvent.type}</Badge>
                        <p className="text-sm font-bold text-foreground">{latestEvent.event}</p>
                        <p className="text-xs text-muted-foreground">{latestEvent.time}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nothing logged yet. Track a meal, workout, or journal entry to see it here.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><Watch className="w-4 h-4 text-indigo-400" /> Sensors & Alerts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Wearables</p>
                        <p className="font-bold text-sm mt-1">{wearableCount.connected} of {wearableCount.total} connected</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Notifications</p>
                        <p className="font-bold text-sm mt-1">{unreadCount} unread</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("notifications")}>View Coaching Feed</Button>
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
                {timeline.length > 0 ? (
                  <div className="space-y-6">
                    {timeline.map((event, idx) => (
                      <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }} className="relative pl-6 pb-6 border-l border-border last:pb-0">
                        <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background"></div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <Badge variant="outline" className="text-[10px] mb-1">{event.type}</Badge>
                            <h4 className="font-bold">{event.event}</h4>
                          </div>
                          <span className="text-xs text-muted-foreground">{event.time}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={History} title="No events logged yet" description="Track a meal, workout, or journal entry to start building your timeline." />
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "knowledge" ? (
          <motion.div key="knowledge" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Personal Knowledge Graph</CardTitle>
                <CardDescription>How the AI connects your current state, its forecast, and its next suggestion.</CardDescription>
              </CardHeader>
              <CardContent>
                {cognition?.twinProjections?.currentBaseline ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-card border-2 border-primary p-3 rounded-xl text-center shadow-md max-w-sm">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase">Current State</span>
                      <span className="font-bold text-sm">{cognition.twinProjections.currentBaseline}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background px-2 relative z-10">Forecasts To</span>
                      <div className="w-0.5 h-8 bg-border -mt-2"></div>
                    </div>
                    <div className="bg-card border-2 border-indigo-400 p-3 rounded-xl text-center shadow-md max-w-sm">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase">30-Day Forecast</span>
                      <span className="font-bold text-sm">{cognition.twinProjections.forecast30Days}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background px-2 relative z-10">Suggests</span>
                      <div className="w-0.5 h-8 bg-border -mt-2"></div>
                    </div>
                    <div className="bg-card border-2 border-green-500 p-3 rounded-xl text-center shadow-md max-w-sm">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase">Suggested Intervention</span>
                      <span className="font-bold text-sm">{cognition.twinProjections.suggestedIntervention}</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Network} title="No graph yet" description="Recalibrate your Digital Twin to generate a personalized reasoning graph." />
                )}
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
                {cognition?.memorySystem?.length > 0 ? (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                    {cognition.memorySystem.map((block: any, idx: number) => (
                      <motion.div key={idx} variants={staggerItem} className="p-4 bg-muted/20 border border-border rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{block.type}</Badge>
                          <span className="text-[10px] text-muted-foreground font-bold">{block.status}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{block.count} {block.count === 1 ? "memory" : "memories"} recorded &bull; last updated {block.lastUpdated}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState icon={BrainCircuit} title="No memories yet" description="Journal entries and quest completions build Coach Nova's long-term memory of you." />
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "wearables" ? (
          <motion.div key="wearables" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <WearablesSection />
          </motion.div>
        ) : (
          <motion.div key="notifications" variants={tabPanel} initial="hidden" animate="visible" exit="exit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Ambient Interventions</CardTitle>
                <CardDescription>Real-time updates and recommendations sent to your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifs.length > 0 ? (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                    {notifs.map((note) => (
                      <motion.div key={note.id} variants={staggerItem} className={`bg-card border border-border p-4 rounded-xl space-y-2 relative overflow-hidden ${note.isRead ? "opacity-60" : ""}`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${notifTypeColor[note.type] || "bg-primary"}`}></div>
                        <div className="flex justify-between items-start pl-2">
                          <h4 className="font-bold">{note.title}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{new Date(note.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</Badge>
                        </div>
                        <p className="text-sm text-foreground pl-2">{note.message}</p>
                        <div className="pl-2 pt-2 border-t border-border/40 flex justify-between items-center mt-2">
                          {note.isRead ? (
                            <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Acknowledged</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" /> {note.type}</span>
                          )}
                          {!note.isRead && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                              disabled={acknowledging === note.id}
                              onClick={() => handleAcknowledge(note.id)}
                            >
                              {acknowledging === note.id ? "Acknowledging..." : "Acknowledge"}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState icon={Bell} title="No notifications yet" description="Ambient coaching nudges and system alerts will show up here as they happen." />
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
