import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Shield, CreditCard, Bell, Cpu, Key, Download, Trash2, CheckCircle2, AlertCircle, Laptop, RefreshCw } from 'lucide-react';

function formatUptime(seconds?: number): string {
  if (!seconds && seconds !== 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

export default function Enterprise() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"billing" | "health" | "notifications" | "security" | "developer">("billing");
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [deviceList, setDeviceList] = useState<any[]>([]);
  const [devKeyInfo, setDevKeyInfo] = useState<any>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadTabContent();
  }, [user, activeTab]);

  const loadTabContent = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (activeTab === "billing") {
        const subRes = await fetch("/api/subscription", { headers: { Authorization: `Bearer ${token}` } });
        const subData = await subRes.json();
        setSubscription(subData.subscription);

        const billRes = await fetch("/api/billing", { headers: { Authorization: `Bearer ${token}` } });
        const billData = await billRes.json();
        setBillingInfo(billData);
      } else if (activeTab === "health") {
        const healthRes = await fetch("/api/admin/health", { headers: { Authorization: `Bearer ${token}` } });
        const data = await healthRes.json();
        setHealthData(data);
      } else if (activeTab === "notifications") {
        const notifRes = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
        const data = await notifRes.json();
        setNotifs(data.notifications || []);
      } else if (activeTab === "security") {
        const devRes = await fetch("/api/devices", { headers: { Authorization: `Bearer ${token}` } });
        const data = await devRes.json();
        setDeviceList(data.devices || []);
      } else if (activeTab === "developer") {
        const keyRes = await fetch("/api/developer/keys", { headers: { Authorization: `Bearer ${token}` } });
        const data = await keyRes.json();
        setDevKeyInfo(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: string) => {
    try {
      const token = await getToken();
      await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan, billingCycle: "monthly" })
      });
      loadTabContent();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegenerateKey = async () => {
    if (devKeyInfo?.hasKey && !window.confirm("This will invalidate your existing API key. Continue?")) return;
    setRegenerating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/developer/keys/regenerate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRevealedKey(data.key);
      loadTabContent();
    } catch (e) {
      console.error(e);
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportData = async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `innerverse-gdpr-export-${Date.now()}.json`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" /> Enterprise Platform & Cloud
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            SaaS subscription, cloud infrastructure health, audit logs, and security management.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-full text-xs font-mono">
           <Cpu className="w-3 h-3 text-green-500" /> v9.4.0-enterprise (us-central1)
        </div>
      </div>

      <div className="flex border border-border p-1 bg-muted/40 rounded-xl overflow-x-auto scrollbar-hide gap-1">
        <button onClick={() => setActiveTab("billing")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "billing" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <CreditCard className="w-4 h-4" /> Plans & Billing
        </button>
        <button onClick={() => setActiveTab("health")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "health" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Cpu className="w-4 h-4" /> System Health
        </button>
        <button onClick={() => setActiveTab("notifications")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "notifications" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Bell className="w-4 h-4" /> Notifications
        </button>
        <button onClick={() => setActiveTab("security")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "security" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Shield className="w-4 h-4" /> Security & GDPR
        </button>
        <button onClick={() => setActiveTab("developer")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "developer" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Key className="w-4 h-4" /> Developer API
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "billing" ? (
          <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className={`border-2 ${subscription?.plan === 'Free' ? 'border-primary' : 'border-border'}`}>
                  <CardHeader>
                     <div className="flex justify-between items-center mb-2">
                        <CardTitle className="text-xl">Free Tier</CardTitle>
                        {subscription?.plan === 'Free' && <Badge className="bg-primary text-primary-foreground">Current</Badge>}
                     </div>
                     <CardDescription>Basic digital twin and manual tracking.</CardDescription>
                     <div className="text-3xl font-black mt-2">$0 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <ul className="text-xs space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Basic Digital Twin</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Standard Analytics</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Community Access</li>
                     </ul>
                     <Button variant="outline" onClick={() => handleSelectPlan("Free")} className="w-full font-bold">Switch to Free</Button>
                  </CardContent>
               </Card>

               <Card className={`border-2 ${subscription?.plan === 'Pro' ? 'border-primary' : 'border-border'}`}>
                  <CardHeader>
                     <div className="flex justify-between items-center mb-2">
                        <CardTitle className="text-xl">Pro Tier</CardTitle>
                        {subscription?.plan === 'Pro' && <Badge className="bg-primary text-primary-foreground">Current</Badge>}
                     </div>
                     <CardDescription>Multi-Agent Life OS & Proactive Coach.</CardDescription>
                     <div className="text-3xl font-black mt-2">$29 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <ul className="text-xs space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Autonomous Multi-Agent Council</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Real-time Predictive Analytics</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Daily Autonomous Planner</li>
                     </ul>
                     <Button onClick={() => handleSelectPlan("Pro")} className="w-full font-bold">Upgrade to Pro</Button>
                  </CardContent>
               </Card>

               <Card className={`border-2 ${subscription?.plan === 'Enterprise' ? 'border-primary' : 'border-border'}`}>
                  <CardHeader>
                     <div className="flex justify-between items-center mb-2">
                        <CardTitle className="text-xl">Enterprise</CardTitle>
                        {subscription?.plan === 'Enterprise' && <Badge className="bg-primary text-primary-foreground">Current</Badge>}
                     </div>
                     <CardDescription>Dedicated Cloud, Custom Agents & SLA.</CardDescription>
                     <div className="text-3xl font-black mt-2">$99 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <ul className="text-xs space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Dedicated High-Speed Instance</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Custom Knowledge Graphs</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> 99.99% SLA & Priority Support</li>
                     </ul>
                     <Button variant="outline" onClick={() => handleSelectPlan("Enterprise")} className="w-full font-bold">Contact Sales / Upgrade</Button>
                  </CardContent>
               </Card>
            </div>

            <Card className="border-border">
               <CardHeader>
                  <CardTitle className="text-lg">Recent Invoices & Payment History</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                  {billingInfo?.invoices?.map((inv: any) => (
                     <div key={inv.id} className="p-3 bg-card border border-border rounded-lg flex justify-between items-center">
                        <div>
                           <p className="font-bold text-sm">${(inv.amount / 100).toFixed(2)} {inv.currency}</p>
                           <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{inv.status.toUpperCase()}</Badge>
                     </div>
                  ))}
               </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "health" ? (
          <motion.div key="health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="p-4 bg-muted/30 border border-border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Process Uptime</p>
                  <p className="text-2xl font-black font-mono mt-1 text-green-500">{formatUptime(healthData?.uptimeSeconds)}</p>
               </div>
               <div className="p-4 bg-muted/30 border border-border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Active Instances</p>
                  <p className="text-2xl font-black font-mono mt-1 text-primary">{healthData?.activeInstances ?? 1}</p>
               </div>
               <div className="p-4 bg-muted/30 border border-border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-black font-mono mt-1 text-indigo-400">{healthData?.metrics?.avgResponseTimeMs ?? 0} ms</p>
               </div>
               <div className="p-4 bg-muted/30 border border-border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-black font-mono mt-1 text-emerald-400">{healthData?.metrics?.errorRate ?? '0.00%'}</p>
               </div>
            </div>

            <Card className="border-border">
               <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Microservice Observability</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                  {healthData?.services?.map((svc: any, i: number) => (
                     <div key={i} className="p-4 bg-card border border-border rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                           <h4 className="font-bold text-sm">{svc.name}</h4>
                           <span className="text-xs text-muted-foreground font-mono">Latency: {svc.latencyMs}ms</span>
                        </div>
                        <Badge className={svc.status === 'operational' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>{svc.status.replace('_', ' ').toUpperCase()}</Badge>
                     </div>
                  ))}
               </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "notifications" ? (
          <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Card className="border-border">
                <CardHeader>
                   <CardTitle className="text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-indigo-400" /> Notifications & Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {notifs.map((n: any) => (
                      <div key={n.id} className={`p-4 border rounded-xl flex justify-between items-start ${n.isRead ? 'bg-card border-border' : 'bg-primary/5 border-primary/30'}`}>
                         <div>
                            <h4 className="font-bold text-sm">{n.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                            <span className="text-[10px] text-muted-foreground font-mono mt-2 block">{new Date(n.createdAt).toLocaleString()}</span>
                         </div>
                         <Badge variant={n.isRead ? "outline" : "default"} className="uppercase text-[9px]">{n.type}</Badge>
                      </div>
                   ))}
                </CardContent>
             </Card>
          </motion.div>
        ) : activeTab === "security" ? (
          <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
             <Card className="border-border">
                <CardHeader>
                   <CardTitle className="text-lg flex items-center gap-2"><Laptop className="w-5 h-5 text-blue-500" /> Active Trusted Devices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {deviceList.map((d: any) => (
                      <div key={d.id} className="p-4 bg-card border border-border rounded-xl flex justify-between items-center">
                         <div>
                            <h4 className="font-bold text-sm">{d.deviceName}</h4>
                            <p className="text-xs text-muted-foreground font-mono mt-1">IP: {d.lastIp} • Last Active: {new Date(d.lastActiveAt).toLocaleString()}</p>
                         </div>
                         <Badge className="bg-green-500/10 text-green-500 border-green-500/20">TRUSTED</Badge>
                      </div>
                   ))}
                </CardContent>
             </Card>

             <Card className="border-border">
                <CardHeader>
                   <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> GDPR & Privacy Governance</CardTitle>
                   <CardDescription>Export your complete raw dataset or request permanent account deletion.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                   <Button onClick={handleExportData} className="font-bold flex items-center gap-2"><Download className="w-4 h-4" /> Download Complete GDPR Data Package</Button>
                   <Button variant="destructive" className="font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" /> Request Account Eradication</Button>
                </CardContent>
             </Card>
          </motion.div>
        ) : (
          <motion.div key="developer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Card className="border-border">
                <CardHeader>
                   <CardTitle className="text-lg flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" /> Developer API Key</CardTitle>
                   <CardDescription>Generate a real, hashed API key for this account. The plaintext key is shown only once, at creation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="p-4 bg-muted/30 border border-border rounded-xl">
                      <p className="text-xs uppercase font-bold text-muted-foreground mb-1">
                        {revealedKey ? "New API Key (copy it now — it won't be shown again)" : devKeyInfo?.hasKey ? "Active API Key" : "No API Key Yet"}
                      </p>
                      <code className="text-sm font-mono bg-background p-2 rounded border border-border block overflow-x-auto text-primary">
                        {revealedKey || devKeyInfo?.keyPreview || "Generate a key to get started"}
                      </code>
                   </div>
                   <Button onClick={handleRegenerateKey} disabled={regenerating} variant="outline" className="font-bold flex items-center gap-2">
                     <RefreshCw className="w-4 h-4" /> {regenerating ? "Generating..." : devKeyInfo?.hasKey ? "Regenerate Key" : "Generate Key"}
                   </Button>
                </CardContent>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
