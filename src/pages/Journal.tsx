import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { BookOpen, Sparkles, Brain } from "lucide-react";
import { Badge } from "../components/ui/badge.tsx";
import { motion, AnimatePresence } from "motion/react";

export default function Journal() {
  const { getToken } = useAuth();
  const [entry, setEntry] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/journal", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.entries) {
          setEntries(data.entries);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchEntries();
  }, [getToken]);

  const handleSave = async () => {
    if (!entry.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: entry,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      const data = await res.json();

      if (data.entry) {
        setEntries([data.entry, ...entries]);
      }
      setEntry("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-secondary" />
          Mindful Journaling
        </h1>
        <p className="text-muted-foreground">
          Log your daily thoughts and receive AI-powered emotional analysis.
        </p>
      </header>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>New Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[150px] resize-none"
            placeholder="How are you feeling today? What did you accomplish?"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex-col items-start md:flex-row md:items-center justify-between gap-4 border-t border-border bg-muted/20 py-4">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Brain className="w-3 h-3" /> AI will analyze sentiment upon saving.
          </span>
          <Button
            className="w-full md:w-auto"
            onClick={handleSave}
            disabled={loading || !entry.trim()}
          >
            {loading ? "Analyzing..." : "Save Entry"}
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Previous Entries</h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground italic">
            No entries yet. Start writing to see emotional trends.
          </p>
        ) : (
          <AnimatePresence>
            {entries.map((e, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-border shadow-sm hover:border-primary/30 transition-colors">
                  <CardHeader className="py-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-muted-foreground text-sm sm:text-base">
                      {e.date}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="text-secondary border-secondary/30"
                      >
                        Mood: {e.mood}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-accent border-accent/30"
                      >
                        Sentiment: {e.sentiment}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground">{e.content}</p>
                    <div className="mt-4 p-3 bg-muted rounded-md flex gap-2">
                      <Sparkles className="w-5 h-5 text-primary shrink-0" />
                      <p className="text-sm italic text-muted-foreground">
                        {e.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
