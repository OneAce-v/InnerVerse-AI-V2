import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Camera, ScanBarcode, X, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "../../AuthContext.tsx";

interface FoodScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodLogged: (log: any) => void;
  type: "camera" | "barcode";
}

const scanPresets = [
  "Grilled Salmon with Avocado and Quinoa",
  "Fresh Fruit Salad with Greek Yogurt",
  "Chicken Breast with Brown Rice and Broccoli",
  "Whole Wheat Toast with Eggs and Spinach",
  "Whey Protein Shake with Peanut Butter",
  "Mixed Nuts and Pumpkin Seeds (50g)"
];

export default function FoodScannerModal({
  isOpen,
  onClose,
  onFoodLogged,
  type,
}: FoodScannerModalProps) {
  const { getToken } = useAuth();
  const [scanningActive, setScanningActive] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [selectedScanPreset, setSelectedScanPreset] = useState("Grilled Salmon with Avocado and Quinoa");
  const [customScanText, setCustomScanText] = useState("");

  const handlePerformFoodScan = async (mealText: string) => {
    setScanningActive(true);
    setScanStatus("Initializing high-resolution lens feed...");
    
    setTimeout(() => {
      setScanStatus("Registering item contours & checking database...");
    }, 800);

    setTimeout(() => {
      setScanStatus("Estimating caloric density & macronuclear contents via Gemini Vision...");
    }, 1600);

    setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/track/food", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ input: mealText })
        });
        const data = await res.json();
        if (data.log) {
          const visLog = { ...data.log, source: "camera", confidence: Math.floor(Math.random() * 12) + 87 };
          onFoodLogged(visLog);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setScanningActive(false);
        onClose();
      }
    }, 2800);
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
                {type === "camera" ? (
                  <Camera className="w-6 h-6 text-primary animate-pulse" />
                ) : (
                  <ScanBarcode className="w-6 h-6 text-primary animate-pulse" />
                )}
                <h3 className="text-xl font-bold">
                  {type === "camera" ? "AI Vision Camera Scanner" : "AI Barcode Laser Scan"}
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Viewfinder simulation */}
            <div className="bg-black aspect-video rounded-xl relative overflow-hidden border border-border flex flex-col justify-between p-4 mb-6">
              {/* Visual Camera Frames */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary/60"></div>
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary/60"></div>
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary/60"></div>
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary/60"></div>

              {/* Laser scan lines */}
              {scanningActive && (
                <motion.div 
                  animate={{ y: [0, 160, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-x-0 h-0.5 bg-primary/70 shadow-[0_0_10px_#4f46e5]"
                />
              )}

              {/* Simulated object focus box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-32 h-32 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center ${scanningActive ? "border-primary animate-ping" : "border-white/30"}`}>
                  <span className="text-[10px] text-white/50 bg-black/40 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest">
                    {type === "camera" ? "Focus Point" : "Align barcode"}
                  </span>
                </div>
              </div>

              <div className="w-full flex justify-between items-start text-white/75 relative z-10 text-[10px] font-mono">
                <span>ISO 400 • F2.8</span>
                <span>{type === "camera" ? "PLATE_DETECTION_ON" : "EAN_13_READING"}</span>
              </div>

              {scanningActive ? (
                <div className="bg-black/80 backdrop-blur-sm self-center text-center p-3 rounded-lg border border-primary/30 max-w-sm w-full mx-auto space-y-2 relative z-10">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-white">{scanStatus}</p>
                </div>
              ) : (
                <div className="bg-black/40 backdrop-blur-xs self-end text-center p-2 rounded text-[11px] text-white/90 relative z-10">
                  Pointing at: <span className="font-bold text-primary">{selectedScanPreset}</span>
                </div>
              )}
              
              <div className="relative z-10 self-end text-[9px] text-white/30 font-mono">
                <span>INNERVERSE-VISION v2.5</span>
              </div>
            </div>

            {/* Selection Presets to Point Camera At */}
            {!scanningActive && (
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select healthy food to simulate plate detection:</label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {scanPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedScanPreset(preset);
                          setCustomScanText("");
                        }}
                        className={`p-2.5 rounded-lg border text-xs text-left font-medium transition-all flex justify-between items-center ${selectedScanPreset === preset ? "bg-primary/10 border-primary text-foreground" : "border-border hover:bg-muted bg-card/40"}`}
                      >
                        <span>{preset}</span>
                        {selectedScanPreset === preset && <span className="text-primary font-bold">✓ Selected</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Or Manual Custom */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Or enter custom meal target:</label>
                  <Input 
                    placeholder="e.g. 1 Chicken Shawarma Wrap" 
                    value={customScanText} 
                    onChange={(e) => {
                      setCustomScanText(e.target.value);
                      setSelectedScanPreset(e.target.value);
                    }}
                    className="text-xs text-foreground bg-muted/40 border-border"
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    className="w-full font-bold py-5 gap-2" 
                    disabled={!selectedScanPreset.trim()}
                    onClick={() => handlePerformFoodScan(selectedScanPreset)}
                  >
                    <Sparkles className="w-4 h-4" /> Initialize AI Lens Scan
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
