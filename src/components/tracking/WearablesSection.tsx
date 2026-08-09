import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";

export default function WearablesSection() {
  const [fitbitConnected, setFitbitConnected] = useState(false);
  const [connectingFitbit, setConnectingFitbit] = useState(false);

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
          <div className="flex justify-between items-center p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 transition-colors">
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
                  Synced 2m ago
                </p>
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none border-none">
              Connected
            </Badge>
          </div>
          <div
            className={`flex justify-between items-center p-3 rounded-lg border transition-colors cursor-pointer ${
              fitbitConnected 
                ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10" 
                : "border-border border-dashed hover:border-primary/50 bg-muted/20"
            }`}
            onClick={() => {
              if (fitbitConnected) {
                setFitbitConnected(false);
                return;
              }
              setConnectingFitbit(true);
              setTimeout(() => {
                setConnectingFitbit(false);
                setFitbitConnected(true);
              }, 2000);
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00B0B9] flex items-center justify-center p-1 shrink-0">
                <span className="text-white font-mono font-bold text-[9px]">
                  fitbit
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">Fitbit Core Sync</p>
                <p className="text-[10px] text-muted-foreground">
                  {connectingFitbit 
                    ? "Authorizing via InnerVerse Cloud OAuth..." 
                    : fitbitConnected 
                      ? "Synced 1s ago • Direct Cloud Feed" 
                      : "Disconnected (Click to Link Accounts)"}
                </p>
              </div>
            </div>
            {connectingFitbit ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs animate-pulse" disabled>
                Processing...
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
