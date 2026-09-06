import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button.tsx";
import { Camera, ScanBarcode, X, RefreshCw, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "../../AuthContext.tsx";

interface FoodScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodLogged: (log: any) => void;
  type: "camera" | "barcode";
}

export default function FoodScannerModal({
  isOpen,
  onClose,
  onFoodLogged,
  type,
}: FoodScannerModalProps) {
  const { getToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<"requesting" | "live" | "denied" | "unsupported">("requesting");
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("requesting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState("live");
      })
      .catch(() => {
        setCameraState("denied");
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isOpen]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setAnalyzing(true);
    setErrorMessage(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/track/food/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Analysis failed. Please try again.");
        return;
      }
      if (data.log) {
        onFoodLogged(data.log);
        onClose();
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Network error while analyzing the photo.");
    } finally {
      setAnalyzing(false);
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
                {type === "camera" ? (
                  <Camera className="w-6 h-6 text-primary animate-pulse" />
                ) : (
                  <ScanBarcode className="w-6 h-6 text-primary animate-pulse" />
                )}
                <h3 className="text-xl font-bold">
                  {type === "camera" ? "AI Vision Camera Scanner" : "AI Barcode / Label Scanner"}
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="bg-black aspect-video rounded-xl relative overflow-hidden border border-border flex flex-col justify-between mb-6">
              {cameraState === "live" && (
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />

              {cameraState === "requesting" && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Requesting camera access...
                </div>
              )}
              {cameraState === "denied" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm gap-2 p-6 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  Camera access was denied. Allow camera permission in your browser, or log this item manually instead.
                </div>
              )}
              {cameraState === "unsupported" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm gap-2 p-6 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  This browser/device doesn't support camera capture. Please log this item manually instead.
                </div>
              )}

              {cameraState === "live" && (
                <>
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary/60"></div>
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary/60"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary/60"></div>
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary/60"></div>
                </>
              )}

              {analyzing && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                  <p className="text-xs font-semibold text-white">Analyzing photo with Gemini Vision...</p>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                {errorMessage}
              </div>
            )}

            {!analyzing && (
              <Button
                className="w-full font-bold py-5 gap-2"
                disabled={cameraState !== "live"}
                onClick={handleCapture}
              >
                <Sparkles className="w-4 h-4" /> Capture &amp; Analyze
              </Button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
