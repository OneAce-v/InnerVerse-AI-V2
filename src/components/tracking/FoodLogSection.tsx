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
import { Flame, Camera, ScanBarcode } from "lucide-react";
import { useAuth } from "../../AuthContext.tsx";

interface FoodLogSectionProps {
  foodLogs: any[];
  setFoodLogs: React.Dispatch<React.SetStateAction<any[]>>;
  onOpenScanner: (type: "camera" | "barcode") => void;
}

export default function FoodLogSection({
  foodLogs,
  setFoodLogs,
  onOpenScanner,
}: FoodLogSectionProps) {
  const { getToken } = useAuth();
  const [foodInput, setFoodInput] = useState("");
  const [loadingFood, setLoadingFood] = useState(false);

  const handleFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodInput.trim()) return;
    setLoadingFood(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/track/food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ input: foodInput }),
      });
      const data = await res.json();
      if (data.log) {
        setFoodLogs((prev) => [data.log, ...prev]);
      }
      setFoodInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFood(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" /> Nutrition Log
        </CardTitle>
        <CardDescription>
          Enter meals naturally. E.g. "2 roti and 150g paneer"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleFoodSubmit} className="flex gap-2">
          <Input
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            placeholder="Log a meal..."
          />
          <Button type="submit" disabled={loadingFood || !foodInput.trim()}>
            {loadingFood ? "Analyzing..." : "Log"}
          </Button>
        </form>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 border-dashed"
            onClick={() => onOpenScanner("camera")}
          >
            <Camera className="w-4 h-4" /> Camera Scanner
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 border-dashed"
            onClick={() => onOpenScanner("barcode")}
          >
            <ScanBarcode className="w-4 h-4" /> Barcode Scan
          </Button>
        </div>
        <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
          {foodLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">No meals logged today.</p>
          ) : (
            foodLogs.map((log, i) => (
              <div
                key={i}
                className="p-3 bg-muted rounded-md border border-border text-sm flex justify-between items-center"
              >
                <div>
                  <span className="font-semibold">{log.item}</span>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    <span>{log.calories} kcal</span>
                    <span>{log.protein}g P</span>
                    <span>{log.carbs}g C</span>
                    <span>{log.fats}g F</span>
                  </div>
                </div>
                {log.source === "camera" && (
                  <Badge variant="secondary" className="text-[10px]">
                    Camera ({log.confidence || 90}%)
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
