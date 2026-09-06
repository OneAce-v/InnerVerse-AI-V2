import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Globe, Users, Database, HeartPulse, BrainCircuit, ShieldCheck, FileText, Network, Lock, Search } from 'lucide-react';

export default function Ecosystem() {
  const { getToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"collaboration" | "knowledge" | "healthcare" | "models">("collaboration");
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
      const res = await fetch("/api/ecosystem", {
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

  const handleInviteCollaborator = async () => {
    const email = window.prompt("Email of the InnerVerse user to invite:");
    if (!email || !email.trim()) return;
    try {
      const token = await getToken();
      const res = await fetch("/api/ecosystem/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim() })
      });
      const result = await res.json();
      if (!res.ok) {
        window.alert(result.error || "Failed to invite collaborator");
        return;
      }
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      const token = await getToken();
      await fetch(`/api/ecosystem/collaborators/${id}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBiomarker = async () => {
    const markerName = window.prompt("Biomarker name (e.g. ApoB, HbA1c):");
    if (!markerName || !markerName.trim()) return;
    const value = window.prompt("Value:");
    if (!value) return;
    const unit = window.prompt("Unit (e.g. mg/dL, %):") || "";
    try {
      const token = await getToken();
      await fetch("/api/ecosystem/biomarkers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markerName: markerName.trim(), value, unit })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddKnowledge = async () => {
    const title = window.prompt("Document title:");
    if (!title || !title.trim()) return;
    const content = window.prompt("Paste the text content to index (optional):") || "";
    try {
      const token = await getToken();
      await fetch("/api/ecosystem/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), documentType: "personal_note", content })
      });
      loadData();
    } catch (e) {
      console.error(e);
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
            <Globe className="w-8 h-8 text-primary" /> Human Intelligence Network
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Collaborate with professionals, orchestrate AI models, and integrate enterprise knowledge.
          </p>
        </div>
        <Button className="font-bold flex items-center gap-2">
           <ShieldCheck className="w-4 h-4" /> Manage Data Sharing
        </Button>
      </div>

      <div className="flex border border-border p-1 bg-muted/40 rounded-xl overflow-x-auto scrollbar-hide gap-1">
        <button onClick={() => setActiveTab("collaboration")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "collaboration" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Users className="w-4 h-4" /> Collaborators
        </button>
        <button onClick={() => setActiveTab("knowledge")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "knowledge" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <Database className="w-4 h-4" /> RAG Knowledge Base
        </button>
        <button onClick={() => setActiveTab("healthcare")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "healthcare" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <HeartPulse className="w-4 h-4" /> Healthcare Integration
        </button>
        <button onClick={() => setActiveTab("models")} className={`flex-1 py-3 px-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] ${activeTab === "models" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"}`}>
          <BrainCircuit className="w-4 h-4" /> AI Orchestration
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "collaboration" ? (
          <motion.div key="collaboration" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400" /> Professional Network</CardTitle>
                <CardDescription>Grant secure, role-based access to coaches, mentors, and doctors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data?.collaborators?.map((collab: any) => (
                  <div key={collab.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-border rounded-xl gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold">{collab.name}</h4>
                        <Badge variant="outline" className="text-[10px]">{collab.org}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{collab.role}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {collab.permissions.map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-[10px] bg-muted text-muted-foreground"><Lock className="w-2 h-2 mr-1 inline"/> {p.replace('_', ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => handleRevoke(collab.id)} variant="outline" size="sm" className="whitespace-nowrap border-red-500/20 text-red-500 hover:bg-red-500/10">Revoke Access</Button>
                  </div>
                ))}
                <Button onClick={handleInviteCollaborator} className="w-full border-dashed border-2 bg-transparent text-foreground hover:bg-muted/50" variant="outline">+ Invite Collaborator</Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "knowledge" ? (
          <motion.div key="knowledge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-green-500" /> Personal RAG Knowledge Base</CardTitle>
                <CardDescription>Documents, books, and lab reports indexed for Coach Nova's context.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4 bg-muted/40 p-2 rounded-lg border border-border">
                   <Search className="w-4 h-4 text-muted-foreground ml-2" />
                   <input type="text" placeholder="Search knowledge base..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
                </div>
                <div className="space-y-3">
                  {data?.knowledgeBase?.map((doc: any) => (
                    <div key={doc.id} className="flex justify-between items-center p-3 bg-card border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-bold text-sm">{doc.title}</h4>
                          <span className="text-[10px] uppercase text-muted-foreground">{doc.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Relevance: {doc.relevance}%</Badge>
                    </div>
                  ))}
                  <Button onClick={handleAddKnowledge} variant="secondary" className="w-full mt-2"><FileText className="w-4 h-4 mr-2" /> Upload Document or Sync Library</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === "healthcare" ? (
          <motion.div key="healthcare" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><HeartPulse className="w-5 h-5 text-red-500" /> Clinical Biomarkers</CardTitle>
                <CardDescription>Advanced health metrics synchronized from lab reports and medical providers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data?.healthcare?.biomarkers?.map((marker: any) => (
                    <div key={marker.id} className="p-4 border border-border rounded-xl bg-card relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-12 h-12 -mt-4 -mr-4 rounded-full opacity-10 ${marker.trend === 'improving' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      <p className="text-xs text-muted-foreground font-bold uppercase">{marker.name}</p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-black font-mono">{marker.value}</span>
                        <span className="text-xs text-muted-foreground">{marker.unit}</span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{marker.lastChecked}</span>
                        <Badge variant="outline" className={`border-none px-0 font-bold ${marker.trend === 'improving' ? 'text-green-500' : 'text-blue-500'}`}>
                           {marker.trend.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                   <Button onClick={handleAddBiomarker} variant="outline"><HeartPulse className="w-4 h-4 mr-2" /> Add Biomarker Reading</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="models" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-amber-500" /> Multi-LLM Orchestration</CardTitle>
                <CardDescription>Intelligent routing across frontier and local models based on privacy and capability.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    {data?.models?.map((model: any) => (
                      <div key={model.id} className="p-4 bg-card border border-border rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Network className="w-4 h-4 text-primary" />
                              <h4 className="font-bold font-mono">{model.id}</h4>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                               {model.tasks.map((t: string) => (
                                 <span key={t} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t}</span>
                               ))}
                            </div>
                         </div>
                         <div className="flex items-center gap-4 text-right">
                            <div>
                               <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Latency</p>
                               <span className="text-sm font-mono">{model.latency}</span>
                            </div>
                            <div>
                               <Badge className={model.status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground border-border"}>
                                 {model.status.toUpperCase()}
                               </Badge>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
