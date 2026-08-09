import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "../components/ui/card.tsx";
import { motion } from "motion/react";
import { Activity } from "lucide-react";
import { useAuth } from "../AuthContext.tsx";

// Sub-components
import HabitTracker from "../components/tracking/HabitTracker.tsx";
import FoodLogSection from "../components/tracking/FoodLogSection.tsx";
import ExerciseLogSection from "../components/tracking/ExerciseLogSection.tsx";
import WearablesSection from "../components/tracking/WearablesSection.tsx";
import FoodScannerModal from "../components/tracking/FoodScannerModal.tsx";
import MotionFormTrackerModal from "../components/tracking/MotionFormTrackerModal.tsx";

export default function Tracking() {
  const { getToken } = useAuth();
  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);

  // Modal controls
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<"camera" | "barcode">("camera");
  const [motionOpen, setMotionOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const [foodRes, execRes] = await Promise.all([
          fetch("/api/track/food", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/track/exercise", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const foodData = await foodRes.json();
        const execData = await execRes.json();

        if (foodData.logs) setFoodLogs(foodData.logs);
        if (execData.logs) setExerciseLogs(execData.logs);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLogs();
  }, [getToken]);

  const totalCalories = foodLogs.reduce((acc, log) => acc + (log.calories || 0), 0);
  const totalProtein = foodLogs.reduce((acc, log) => acc + (log.protein || 0), 0);
  const totalCarbs = foodLogs.reduce((acc, log) => acc + (log.carbs || 0), 0);
  const totalFats = foodLogs.reduce((acc, log) => acc + (log.fats || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-6xl mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Smart Data Tracking
          </h1>
          <p className="text-muted-foreground">
            Log your nutrition and exercise or connect wearables.
          </p>
        </div>
      </header>

      {/* Daily Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Calories
            </p>
            <p className="text-2xl font-black">
              {totalCalories}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / 2200
              </span>
            </p>
            <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full"
                style={{
                  width: `${Math.min(100, (totalCalories / 2200) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Protein
            </p>
            <p className="text-2xl font-black">
              {totalProtein}g{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / 140g
              </span>
            </p>
            <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full"
                style={{
                  width: `${Math.min(100, (totalProtein / 140) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Carbs
            </p>
            <p className="text-2xl font-black">
              {totalCarbs}g{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / 250g
              </span>
            </p>
            <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${Math.min(100, (totalCarbs / 250) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Fats
            </p>
            <p className="text-2xl font-black">
              {totalFats}g{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / 70g
              </span>
            </p>
            <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-yellow-500 h-full"
                style={{ width: `${Math.min(100, (totalFats / 70) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Habits Calibration Section */}
      <HabitTracker />

      {/* Logging Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Food Tracking */}
        <FoodLogSection 
          foodLogs={foodLogs} 
          setFoodLogs={setFoodLogs} 
          onOpenScanner={(type) => {
            setScannerType(type);
            setScannerOpen(true);
          }} 
        />

        <div className="space-y-6">
          {/* Exercise Tracking */}
          <ExerciseLogSection 
            exerciseLogs={exerciseLogs} 
            setExerciseLogs={setExerciseLogs} 
            onOpenMotionTracker={() => setMotionOpen(true)} 
          />

          {/* Connected Wearables Sync */}
          <WearablesSection />
        </div>
      </div>

      {/* AI Vision Scan Modal */}
      <FoodScannerModal 
        isOpen={scannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onFoodLogged={(log) => setFoodLogs((prev) => [log, ...prev])} 
        type={scannerType} 
      />

      {/* AI Skeletal Motion Analysis Modal */}
      <MotionFormTrackerModal 
        isOpen={motionOpen} 
        onClose={() => setMotionOpen(false)} 
        onExerciseLogged={(log) => setExerciseLogs((prev) => [log, ...prev])} 
      />
    </motion.div>
  );
}
