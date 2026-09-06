import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { useAuth } from "../../AuthContext.tsx";

export default function WearablesSection() {
  const { getToken, user } = useAuth();
  const [connections, setConnections] = useState<any[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadConnections();
  }, [user]);

  const loadConnections = async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/wearables", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fitbit = connections.find((c) => c.provider === "fitbit");
  const fitbitConnected = Boolean(fitbit?.connected);

  const handleToggleFitbit = async () => {
    setToggling("fitbit");
    try {
      const token = await getToken();
      await fetch("/api/wearables/fitbit/toggle", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadConnections();
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Connected Devices
        </CardTitle>
        <CardDescription>
          Sync data automatically from your wearables
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center p-3 rounded-lg border border-border border-dashed bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E3E3E3] flex items-center justify-center p-1.5">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
                  alt="Apple Health"
                />
              </div>
              <div>
                <p className="text-sm font-semibold">Apple Health</p>
                <p className="text-[10px] text-muted-foreground">
                  Not available in a web browser (requires a native iOS app)
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              Unavailable
            </Badge>
          </div>
          <div
            className={`flex justify-between items-center p-3 rounded-lg border transition-colors cursor-pointer ${
              fitbitConnected
                ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                : "border-border border-dashed hover:border-primary/50 bg-muted/20"
            }`}
            onClick={handleToggleFitbit}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00B0B9] flex items-center justify-center p-1 shrink-0">
                <span className="text-white font-mono font-bold text-[9px]">
                  fitbit
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">Fitbit</p>
                <p className="text-[10px] text-muted-foreground">
                  {toggling === "fitbit"
                    ? "Updating..."
                    : fitbitConnected && fitbit?.lastSync
                      ? `Connected • Linked ${new Date(fitbit.lastSync).toLocaleString()}`
                      : "Not connected (click to link)"}
                </p>
              </div>
            </div>
            {toggling === "fitbit" ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs animate-pulse" disabled>
                Updating...
              </Button>
            ) : fitbitConnected ? (
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none border-none">
                Connected
              </Badge>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-bold">
                Connect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
