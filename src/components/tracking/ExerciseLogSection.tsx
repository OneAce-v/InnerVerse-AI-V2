import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { Dumbbell, Camera } from "lucide-react";
import { useAuth } from "../../AuthContext.tsx";

interface ExerciseLogSectionProps {
  exerciseLogs: any[];
  setExerciseLogs: React.Dispatch<React.SetStateAction<any[]>>;
  onOpenMotionTracker: () => void;
}

export default function ExerciseLogSection({
  exerciseLogs,
  setExerciseLogs,
  onOpenMotionTracker,
}: ExerciseLogSectionProps) {
  const { getToken } = useAuth();
  const [exerciseInput, setExerciseInput] = useState("");
  const [loadingExec, setLoadingExec] = useState(false);

  const handleExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseInput.trim()) return;
    setLoadingExec(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/track/exercise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ input: exerciseInput }),
      });
      const data = await res.json();
      if (data.log) {
        setExerciseLogs((prev) => [data.log, ...prev]);
      }
      setExerciseInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExec(false);
    }
  };

  return (
    <Card className="border-border flex-1 h-fit">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-secondary" /> Exercise Log
        </CardTitle>
        <CardDescription>
          Enter reps naturally. E.g. "Bench Press 60kg x 8"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleExerciseSubmit} className="flex gap-2">
          <Input
            value={exerciseInput}
            onChange={(e) => setExerciseInput(e.target.value)}
            placeholder="Log a workout..."
          />
          <Button
            type="submit"
            disabled={loadingExec || !exerciseInput.trim()}
          >
            {loadingExec ? "Analyzing..." : "Log"}
          </Button>
        </form>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={onOpenMotionTracker}
          >
            <Camera className="w-4 h-4" /> AI Form Tracker
          </Button>
        </div>
        <div className="space-y-2 mt-4 max-h-[150px] overflow-y-auto pr-2">
          {exerciseLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">No exercises logged today.</p>
          ) : (
            exerciseLogs.map((log, i) => (
              <div
                key={i}
                className="p-3 bg-muted rounded-md border border-border text-sm flex justify-between items-center"
              >
                <div>
                  <span className="font-semibold">{log.exercise}</span>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    {log.durationMins && <span>{log.durationMins} m</span>}
                    {log.caloriesBurned && (
                      <span>{log.caloriesBurned} kcal</span>
                    )}
                    {log.volume ? <span>{log.volume} vol</span> : null}
                    {log.notes && <span>· {log.notes}</span>}
                  </div>
                </div>
                {log.source === "camera" && (
                  <Badge variant="secondary" className="text-[10px]">
                    AI Vision
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
