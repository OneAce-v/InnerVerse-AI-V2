import React from "react";
import { Link, Navigate } from "react-router";
import { motion } from "motion/react";
import { useAuth } from "../AuthContext.tsx";
import { buttonVariants } from "../components/ui/button.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";
import {
  Heart,
  Network,
  MessageSquare,
  Activity,
  Compass,
  Users,
  Brain,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Network,
    title: "Digital Twin",
    description: "A 16-dimension model of your physical, mental, and lifestyle state, recalibrated as you live your life - not a static quiz result.",
  },
  {
    icon: MessageSquare,
    title: "Coach Nova",
    description: "A conversational AI mentor that reasons over your real profile and history, and explains why it's suggesting something, not just what.",
  },
  {
    icon: Activity,
    title: "Smart Track",
    description: "Log meals and workouts by text or camera, or connect a wearable. Every entry feeds directly back into your Digital Twin.",
  },
  {
    icon: Brain,
    title: "Journal",
    description: "Reflect in your own words. Sentiment and mood are extracted automatically and folded into your emotional and mental state.",
  },
  {
    icon: Compass,
    title: "Autonomous Systems",
    description: "Orchestration, cognition, and research dashboards that surface what the AI is actually deciding and why, in plain language.",
  },
  {
    icon: Users,
    title: "Community & Rewards",
    description: "Earn real XP and coins from what you log, track progress on a leaderboard, and spend coins on genuine unlocks.",
  },
];

export default function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight text-lg">InnerVerse AI</span>
        </div>
        <Link to="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60%] h-[50%] rounded-full bg-primary/15 blur-[110px] pointer-events-none -z-10"
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col items-center"
        >
          <motion.div variants={staggerItem} className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/60 text-xs font-semibold text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Explainable AI, not a black box
          </motion.div>

          <motion.h1 variants={staggerItem} className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl">
            Your health, modeled by{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              AI that shows its work
            </span>
          </motion.h1>

          <motion.p variants={staggerItem} className="mt-6 text-lg text-muted-foreground max-w-xl">
            InnerVerse builds a living Digital Twin from what you actually track, then
            explains every recommendation with real evidence - no guesswork, no fake numbers.
          </motion.p>

          <motion.div variants={staggerItem} className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Link to="/login" className={buttonVariants({ size: "lg", className: "h-12 px-8 text-base shadow-glow" })}>
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-8 text-base" })}>
              See how it works
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-black tracking-tight">One platform, six real systems</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Everything here is backed by your actual data - nothing is a placeholder waiting to be filled in later.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={staggerItem}>
              <Card className="h-full border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5.5 h-5.5 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA band */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          className="relative rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-secondary/10 p-10 md:p-14 text-center overflow-hidden"
        >
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Start building your Digital Twin today
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Sign in with Google and you're onboarded in under two minutes.
          </p>
          <Link to="/login" className={buttonVariants({ size: "lg", className: "h-12 px-8 text-base mt-8 shadow-glow" })}>
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span>InnerVerse AI</span>
          </div>
          <span>&copy; {new Date().getFullYear()} InnerVerse AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
