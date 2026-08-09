import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Droplet,
  Brain,
  Dumbbell,
  Moon,
  Flame,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  Award,
} from "lucide-react";
import { useLanguage } from "../../LanguageContext.tsx";

interface Habit {
  id: string;
  name: string;
  category: "water" | "mind" | "activity" | "sleep" | "nutrition" | "custom";
  completed: boolean;
  target: string;
}

const defaultHabits: Habit[] = [
  { id: "habit-1", name: "Hydration Target", category: "water", target: "3.0 Liters", completed: false },
  { id: "habit-2", name: "Mindful Pause", category: "mind", target: "10 mins meditation", completed: false },
  { id: "habit-3", name: "Active Stride", category: "activity", target: "10,000 steps", completed: false },
  { id: "habit-4", name: "Digital Sunset", category: "sleep", target: "No screens after 10 PM", completed: false },
  { id: "habit-5", name: "Green Fuel", category: "nutrition", target: "2 cups green veggies", completed: false },
];

export default function HabitTracker() {
  const { t } = useLanguage();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState<Habit["category"]>("custom");
  const [newHabitTarget, setNewHabitTarget] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("innerverse_habits");
    if (saved) {
      try {
        setHabits(JSON.parse(saved));
      } catch (e) {
        setHabits(defaultHabits);
      }
    } else {
      setHabits(defaultHabits);
    }
  }, []);

  const saveHabits = (newHabits: Habit[]) => {
    setHabits(newHabits);
    localStorage.setItem("innerverse_habits", JSON.stringify(newHabits));
  };

  const toggleHabit = (id: string) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        return { ...h, completed: !h.completed };
      }
      return h;
    });
    
    const isAllCompletedNow = updated.every((h) => h.completed);
    const wasAllCompletedBefore = habits.every((h) => h.completed);
    
    if (isAllCompletedNow && !wasAllCompletedBefore) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 4000);
    }
    
    saveHabits(updated);
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name: newHabitName.trim(),
      category: newHabitCategory,
      target: newHabitTarget.trim() || "Daily Goal",
      completed: false,
    };

    saveHabits([...habits, newHabit]);
    setNewHabitName("");
    setNewHabitTarget("");
    setNewHabitCategory("custom");
    setShowAddForm(false);
  };

  const deleteHabit = (id: string) => {
    const filtered = habits.filter((h) => h.id !== id);
    saveHabits(filtered);
  };

  const resetAllHabits = () => {
    const reset = habits.map((h) => ({ ...h, completed: false }));
    saveHabits(reset);
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const habitsTotal = habits.length;
  const completionPercentage = habitsTotal > 0 ? Math.round((completedCount / habitsTotal) * 100) : 0;

  const getCategoryIcon = (category: Habit["category"]) => {
    switch (category) {
      case "water":
        return <Droplet className="w-4 h-4 text-blue-500" />;
      case "mind":
        return <Brain className="w-4 h-4 text-purple-500" />;
      case "activity":
        return <Dumbbell className="w-4 h-4 text-emerald-500" />;
      case "sleep":
        return <Moon className="w-4 h-4 text-indigo-500" />;
      case "nutrition":
        return <Flame className="w-4 h-4 text-orange-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getCategoryBg = (category: Habit["category"]) => {
    switch (category) {
      case "water":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "mind":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "activity":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "sleep":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "nutrition":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  return (
    <Card className="border-border bg-gradient-to-br from-card to-card/60 overflow-hidden relative" id="habit-tracker-card">
      {celebrate && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 bg-primary/10 backdrop-blur-xs flex flex-col items-center justify-center z-10 text-center p-4 pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="bg-background/90 border border-primary/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-2"
          >
            <Award className="w-12 h-12 text-yellow-500" />
            <h4 className="font-extrabold text-lg text-foreground">Daily Harmony Achieved!</h4>
            <p className="text-xs text-muted-foreground">All daily biometrics calibrated. +50 XP Streamed</p>
          </motion.div>
        </motion.div>
      )}
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            {t("track.habitsTitle", "Daily Habits Calibration")}
          </CardTitle>
          <CardDescription>
            {t("track.habitsSubtitle", "Check off your daily health habits to train your digital bio-twin.")}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs gap-1.5"
            id="btn-add-custom-habit"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("track.addHabit", "Add Custom Habit")}
          </Button>
          {habits.some(h => h.completed) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetAllHabits}
              className="text-xs text-muted-foreground hover:text-foreground"
              id="btn-reset-habits"
            >
              Reset All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2 bg-muted/40 p-4 rounded-xl border border-border/60">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
            <span>Calibration Completion: {completedCount}/{habitsTotal}</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-primary h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Add Habit form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={addHabit}
              className="p-4 border border-border bg-muted/20 rounded-xl space-y-3 overflow-hidden text-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Habit Name</label>
                  <Input 
                    placeholder={t("track.habitPlaceholder", "Enter daily goal...")}
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    required
                    className="h-9 text-xs"
                    id="input-habit-name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Description</label>
                  <Input 
                    placeholder="e.g. 3L, 10,000 steps, etc."
                    value={newHabitTarget}
                    onChange={(e) => setNewHabitTarget(e.target.value)}
                    className="h-9 text-xs"
                    id="input-habit-target"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</label>
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value as Habit["category"])}
                    className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus-visible:outline-hidden"
                    id="select-habit-category"
                  >
                    <option value="water">💧 Hydration / Water</option>
                    <option value="mind">🧘 Meditation / Mindfulness</option>
                    <option value="activity">🏃 Steps / Cardio</option>
                    <option value="sleep">😴 Sleep / Bedtime</option>
                    <option value="nutrition">🥗 Diet / Nutrition</option>
                    <option value="custom">✨ Custom / Other</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)} id="btn-cancel-habit">
                  Cancel
                </Button>
                <Button type="submit" size="sm" id="btn-save-habit">
                  Create Habit
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Habits Grid */}
        {habitsTotal === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium">No habits registered. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {habits.map((habit) => (
              <motion.div
                key={habit.id}
                layoutId={habit.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  habit.completed 
                    ? "bg-primary/5 border-primary/40 shadow-xs" 
                    : "bg-card border-border hover:border-border/80"
                }`}
                id={`habit-card-${habit.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    type="button"
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      habit.completed 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-muted-foreground/30 hover:border-primary bg-background"
                    }`}
                    id={`btn-toggle-habit-${habit.id}`}
                  >
                    {habit.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  
                  <div className="min-w-0">
                    <p 
                      onClick={() => toggleHabit(habit.id)}
                      className={`text-sm font-semibold truncate cursor-pointer select-none leading-tight ${
                        habit.completed ? "text-muted-foreground line-through decoration-1" : "text-foreground"
                      }`}
                      id={`text-habit-name-${habit.id}`}
                    >
                      {habit.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${getCategoryBg(habit.category)}`}>
                        {habit.category}
                      </span>
                      <span className="truncate">{habit.target}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <div className="p-1.5 rounded-lg bg-muted/40">
                    {getCategoryIcon(habit.category)}
                  </div>
                  {habit.id.startsWith("habit-") && habit.id !== "habit-1" && habit.id !== "habit-2" && habit.id !== "habit-3" && habit.id !== "habit-4" && habit.id !== "habit-5" && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteHabit(habit.id)}
                      id={`btn-delete-habit-${habit.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
