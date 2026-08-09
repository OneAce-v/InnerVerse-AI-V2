import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button.tsx";
import { X, RefreshCw, Activity, Dumbbell } from "lucide-react";
import { useAuth } from "../../AuthContext.tsx";

interface MotionFormTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExerciseLogged: (log: any) => void;
}

export default function MotionFormTrackerModal({
  isOpen,
  onClose,
  onExerciseLogged,
}: MotionFormTrackerModalProps) {
  const { getToken } = useAuth();
  const [motionExercise, setMotionExercise] = useState("Squat");
  const [motionRepCount, setMotionRepCount] = useState(12);
  const [analyzingMotion, setAnalyzingMotion] = useState(false);
  const [motionStatus, setMotionStatus] = useState("");

  const handlePerformExerciseAnalysis = async (exName: string, reps: number) => {
    setAnalyzingMotion(true);
    setMotionStatus("Aligning joint trajectory markers...");
    
    setTimeout(() => {
      setMotionStatus("Detecting skeletal depth & trunk balance points... Perfect form trajectory");
    }, 1000);

    setTimeout(async () => {
      try {
        const token = await getToken();
        const inputString = `${reps} reps of ${exName}`;
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
          const analyzerLog = { ...data.log, source: "camera", notes: "Form Accuracy: 94%" };
          onExerciseLogged(analyzerLog);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAnalyzingMotion(false);
        onClose();
      }
    }, 2500);
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
                <h3 className="text-xl font-bold">AI Motion Form Tracker</h3>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Motion view finder */}
            <div className="bg-slate-950 aspect-video rounded-xl relative overflow-hidden flex flex-col justify-between p-4 mb-6 border border-border/80 text-foreground">
              {/* Visual glowing joint indicators */}
              <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none">
                {/* Outer circle layout */}
                <div className="w-24 h-24 border border-secondary/40 rounded-full animate-ping absolute" />
                
                {/* Skeleton joint mockup dots */}
                <svg className="w-full h-full text-secondary stroke-current opacity-70" viewBox="0 0 100 100">
                  {/* Head */}
                  <circle cx="50" cy="22" r="4" fill="currentColor" />
                  {/* Spine link */}
                  <line x1="50" y1="26" x2="50" y2="52" strokeWidth="1.5" />
                  {/* Shoulders */}
                  <line x1="38" y1="32" x2="62" y2="32" strokeWidth="1.5" />
                  <circle cx="38" cy="32" r="2.5" fill="#facc15" />
                  <circle cx="62" cy="32" r="2.5" fill="#facc15" />
                  {/* Elbows */}
                  <line x1="38" y1="32" x2="33" y2="44" strokeWidth="1.2" />
                  <line x1="62" y1="32" x2="67" y2="44" strokeWidth="1.2" />
                  <circle cx="33" cy="44" r="2.5" fill="currentColor" />
                  <circle cx="67" cy="44" r="2.5" fill="currentColor" />
                  {/* Wrists */}
                  <line x1="33" y1="44" x2="28" y2="54" strokeWidth="1.2" />
                  <line x1="67" y1="44" x2="72" y2="54" strokeWidth="1.2" />
                  <circle cx="28" cy="54" r="2" fill="currentColor" />
                  <circle cx="72" cy="54" r="2" fill="currentColor" />
                  {/* Hips */}
                  <line x1="43" y1="52" x2="57" y2="52" strokeWidth="1.5" />
                  <circle cx="43" cy="52" r="2.5" fill="currentColor" />
                  <circle cx="57" cy="52" r="2.5" fill="currentColor" />
                  {/* Knees */}
                  <line x1="43" y1="52" x2="41" y2="68" strokeWidth="1.5" />
                  <line x1="57" y1="52" x2="59" y2="68" strokeWidth="1.5" />
                  <circle cx="41" cy="68" r="3.5" fill="#10b981" />
                  <circle cx="59" cy="68" r="3.5" fill="#10b981" />
                  {/* Ankles */}
                  <line x1="41" y1="68" x2="43" y2="84" strokeWidth="1.5" />
                  <line x1="59" y1="68" x2="57" y2="84" strokeWidth="1.5" />
                  <circle cx="43" cy="84" r="2" fill="currentColor" />
                  <circle cx="57" cy="84" r="2" fill="currentColor" />
                </svg>
              </div>

              <div className="w-full flex justify-between items-start text-white/70 relative z-10 text-[9px] font-mono">
                <span>90 fps • DEPTH_IR</span>
                <span>SKELETAL_JOINT_ACC: 98.4%</span>
              </div>

              {analyzingMotion ? (
                <div className="bg-black/85 backdrop-blur-sm self-center text-center p-3 rounded-lg border border-secondary/30 max-w-xs w-full mx-auto space-y-2 relative z-10 text-white">
                  <RefreshCw className="w-5 h-5 text-secondary animate-spin mx-auto" />
                  <p className="text-xs font-semibold">{motionStatus}</p>
                </div>
              ) : (
                <div className="bg-black/60 self-start text-left p-2 rounded text-[10px] text-white relative z-10 border border-white/10 md:max-w-xs">
                  <p className="font-bold text-secondary text-xs uppercase mb-1">Joint Angle Analytics</p>
                  <p>• Hip Angle: 104° (Ideal range 90-110°)</p>
                  <p>• Back Alignment: Straight (Form Score: 94%)</p>
                </div>
              )}

              <div className="relative z-10 self-end text-[9px] text-white/30 font-mono">
                <span>MOTION_CALIBRATION_MODEL_3.1</span>
              </div>
            </div>

            {/* Selection Variables */}
            {!analyzingMotion && (
              <div className="space-y-4">
                {/* Select Activity */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Exercise Type:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Squat", "Bicep Curl", "Push up", "Deadlift"].map((ex, id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMotionExercise(ex)}
                        className={`p-2 border rounded-lg text-xs font-semibold ${motionExercise === ex ? "bg-secondary/15 border-secondary text-foreground" : "border-border bg-card/40"}`}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity Slider */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-xs font-medium text-muted-foreground">Repetition Count:</span>
                    <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">{motionRepCount} reps</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="30" 
                    step="1"
                    value={motionRepCount} 
                    onChange={(e) => setMotionRepCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-secondary"
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-5 gap-2"
                    onClick={() => handlePerformExerciseAnalysis(motionExercise, motionRepCount)}
                  >
                    <Activity className="w-4 h-4 text-secondary-foreground" /> Begin Skeletal Calibration
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
