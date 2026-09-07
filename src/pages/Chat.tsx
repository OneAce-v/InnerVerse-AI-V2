import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.tsx";
import { Input } from "../components/ui/input.tsx";
import { Button } from "../components/ui/button.tsx";
import { BrainCircuit, Send, User, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

export default function Chat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<
    { role: "user" | "agent"; content: string }[]
  >([
    {
      role: "agent",
      content:
        "Hey there! I am your AI Coach. Ready to crush some wellness goals today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ownsVoice, setOwnsVoice] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/store", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const voiceItem = data.items?.find((i: any) => i.id === "nova_voice");
        setOwnsVoice(!!voiceItem?.owned);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [getToken]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const speak = (text: string) => {
    if (!canSpeak || !ownsVoice || !voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [
      ...messages,
      { role: "user" as const, content: input },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: input, history: newMessages }),
      });
      const data = await res.json();
      const replyText = data.text || "I'm sorry, I encountered an error synthesizing that.";

      setMessages([
        ...newMessages,
        { role: "agent", content: replyText },
      ]);
      speak(replyText);
    } catch (e) {
      console.error(e);
      setMessages([
        ...newMessages,
        {
          role: "agent",
          content: "Network disruption in the architecture framework.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-[calc(100vh-14rem)] md:h-[80vh] flex flex-col border-border shadow-xl">
        <CardHeader className="border-b border-border bg-gradient-to-r from-secondary/10 to-primary/10 rounded-t-xl">
          <CardTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary bg-background flex items-center justify-center shadow-md">
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=coach-nova&backgroundColor=c0aede"
                    alt="Coach Nova"
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Coach Nova</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Level 99 AI Mentor
                </p>
              </div>
            </div>
            {ownsVoice && canSpeak && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={voiceEnabled ? "Mute Coach Nova's voice" : "Enable Coach Nova's voice"}
                onClick={() => {
                  if (voiceEnabled) window.speechSynthesis.cancel();
                  setVoiceEnabled((v) => !v);
                }}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
          ref={scrollRef}
        >
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  scale: 0.8,
                  y: 10,
                  originX: m.role === "user" ? 1 : 0,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 max-w-[80%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-md border ${m.role === "user" ? "border-primary" : "border-secondary"}`}
                >
                  {m.role === "user" ? (
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=user`}
                      alt="User"
                    />
                  ) : (
                    <img
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=coach-nova&backgroundColor=c0aede"
                      alt="Coach"
                      className="scale-110"
                    />
                  )}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm shadow-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-[80%]"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-md border border-secondary">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=coach-nova&backgroundColor=c0aede"
                  alt="Coach"
                  className="scale-110 animate-pulse"
                />
              </div>
              <div className="p-3 rounded-2xl text-sm bg-card border border-border rounded-tl-sm flex items-center gap-1 shadow-sm">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          )}
        </CardContent>
        <div className="p-4 border-t border-border bg-card rounded-b-xl">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your nutrition, sleep, or fitness..."
              className="flex-1 shadow-sm focus-visible:ring-primary"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="shadow-sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </motion.div>
  );
}
