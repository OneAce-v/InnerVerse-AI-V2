import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button.tsx";
import { X, RefreshCw, Dumbbell } from "lucide-react";
import { useAuth } from "../../AuthContext.tsx";

interface MotionFormTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExerciseLogged: (log: any) => void;
}

// Note: this logs a set manually. Real-time camera-based skeletal/form tracking would require
// an on-device pose-estimation model, which this app does not include, so we don't fake it.
export default function MotionFormTrackerModal({
  isOpen,
  onClose,
  onExerciseLogged,
}: MotionFormTrackerModalProps) {
  const { getToken } = useAuth();
  const [exercise, setExercise] = useState("Squat");
  const [repCount, setRepCount] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  const handleLogSet = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      const inputString = `${repCount} reps of ${exercise}`;
      const res = await fetch("/api/track/exercise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ input: inputString })
      });
      const data = await res.json();
      if (data.log) {
        onExerciseLogged({ ...data.log, source: "manual" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-secondary" />
                <h3 className="text-xl font-bold">Log a Set</h3>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Exercise Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Squat", "Bicep Curl", "Push up", "Deadlift"].map((ex, id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setExercise(ex)}
                      className={`p-2 border rounded-lg text-xs font-semibold ${exercise === ex ? "bg-secondary/15 border-secondary text-foreground" : "border-border bg-card/40"}`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Repetition Count:</span>
                  <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">{repCount} reps</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={repCount}
                  onChange={(e) => setRepCount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-secondary"
                />
              </div>

              <div className="pt-2">
                <Button
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-5 gap-2"
                  disabled={submitting}
                  onClick={handleLogSet}
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Dumbbell className="w-4 h-4" />}
                  {submitting ? "Logging..." : "Log Set"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
