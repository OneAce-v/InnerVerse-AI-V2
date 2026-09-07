import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Flame,
  Coins,
  Medal,
  Users,
  ShoppingBag,
  Gift,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useAuth } from "../AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { PageHeader } from "../components/ui/page-header.tsx";
import { staggerContainer, staggerItem } from "@/lib/motion";

const STORE_ITEM_DISPLAY: Record<string, { desc: string; icon: any; color: string; bg: string }> = {
  streak_freeze: {
    desc: "Protect your streak for one day of inactivity.",
    icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  cosmic_theme: {
    desc: "Unlock the exclusive dark cosmic color scheme in Settings.",
    icon: Sparkles,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  nova_voice: {
    desc: "Coach Nova reads its replies aloud in the chat.",
    icon: Gift,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  pro_analytics: {
    desc: "Unlocks the advanced insights panel in Analytics.",
    icon: Trophy,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
};

export default function Community() {
  const { getToken, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "store">(
    "leaderboard",
  );
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [coins, setCoins] = useState(0);
  const [purchaseMsg, setPurchaseMsg] = useState("");
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/leaderboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.leaderboard) setLeaderboard(data.leaderboard);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLeaderboard();
  }, [getToken, user]);

  const fetchStore = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/store", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.items) setStoreItems(data.items);
      setCoins(data.coins || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStore();
  }, [getToken]);

  const handlePurchase = async (itemId: string, title: string) => {
    setPurchasing(itemId);
    try {
      const token = await getToken();
      const res = await fetch("/api/store/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoins(data.coins);
        setPurchaseMsg(`Successfully purchased: ${title}!`);
        await fetchStore();
      } else {
        setPurchaseMsg(data.error || "Purchase failed");
      }
    } catch (e) {
      console.error(e);
      setPurchaseMsg("Purchase failed");
    } finally {
      setPurchasing(null);
      setTimeout(() => setPurchaseMsg(""), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-5xl mx-auto"
    >
      <PageHeader
        icon={Users}
        title="Community & Rewards"
        description="Compete, earn coins, and unlock exclusive rewards."
        action={
          <div className="flex gap-2">
            <Button
              variant={activeTab === "leaderboard" ? "default" : "outline"}
              onClick={() => setActiveTab("leaderboard")}
              className="gap-2"
            >
              <Trophy className="w-4 h-4" /> Leaderboard
            </Button>
            <Button
              variant={activeTab === "store" ? "default" : "outline"}
              onClick={() => setActiveTab("store")}
              className="gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Rewards Store
            </Button>
          </div>
        }
      />

      {/* --- STORE TAB --- */}
      {activeTab === "store" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div>
              <h2 className="text-xl font-bold mb-1">Your Wallet</h2>
              <p className="text-sm text-muted-foreground">
                Spend the coins you earn by tracking habits and completing
                quests.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-yellow-500/10 px-6 py-3 rounded-2xl border border-yellow-500/20">
              <Coins className="w-8 h-8 text-yellow-500" />
              <span className="text-3xl font-black text-yellow-500">
                {coins}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {purchaseMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-primary/20 text-primary px-4 py-3 rounded-xl border border-primary/30 flex items-center gap-2 font-bold"
              >
                <AlertCircle className="w-5 h-5" /> {purchaseMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {storeItems.map((item) => {
              const display = STORE_ITEM_DISPLAY[item.id];
              const owned = item.owned > 0;
              const isOneTimeOwned = owned && !item.consumable;
              return (
                <motion.div key={item.id} variants={staggerItem}>
                <Card
                  className="border-border hover:border-primary/50 transition-colors flex flex-col"
                >
                  <CardContent className="p-6 flex flex-col h-full items-center text-center">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${display.bg}`}
                    >
                      <display.icon className={`w-8 h-8 ${display.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-xs text-muted-foreground flex-grow mb-6">
                      {display.desc}
                    </p>
                    {item.consumable && owned && (
                      <Badge variant="outline" className="mb-3 text-[10px]">
                        {item.owned} in reserve
                      </Badge>
                    )}

                    {isOneTimeOwned ? (
                      <Button className="w-full gap-2 font-bold" variant="secondary" disabled>
                        <CheckCircle2 className="w-4 h-4" /> Owned
                      </Button>
                    ) : (
                      <Button
                        className="w-full gap-2 font-bold"
                        variant={coins >= item.cost ? "default" : "secondary"}
                        disabled={purchasing === item.id}
                        onClick={() => handlePurchase(item.id, item.title)}
                      >
                        <Coins className="w-4 h-4" /> {purchasing === item.id ? "Purchasing..." : item.cost}
                      </Button>
                    )}
                  </CardContent>
                </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      )}

      {/* --- LEADERBOARD TAB --- */}
      {activeTab === "leaderboard" && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="flex-1 flex gap-2">
              <span className="w-8 text-center shrink-0">Rank</span>
              <span>Member</span>
            </div>
            <div className="flex gap-4 sm:gap-8 justify-end w-1/2 sm:w-auto text-right">
              <span className="w-16">Level</span>
              <span className="w-16">XP</span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {leaderboard.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Loading ranks...
              </div>
            )}
            {leaderboard.map((member, index) => {
              const isMe = user?.email === member.email;
              let RankIcon = null;
              let rankColor = "text-muted-foreground";
              if (index === 0) {
                RankIcon = Trophy;
                rankColor = "text-yellow-500 fill-yellow-500";
              }
              if (index === 1) {
                RankIcon = Medal;
                rankColor = "text-gray-400 fill-gray-400";
              }
              if (index === 2) {
                RankIcon = Medal;
                rankColor = "text-amber-600 fill-amber-600";
              }

              return (
                <div
                  key={member.id}
                  className={`p-4 flex items-center justify-between hover:bg-muted/30 transition-colors ${isMe ? "bg-primary/5" : ""}`}
                >
                  <div className="flex-1 flex items-center gap-4 cursor-pointer">
                    <span
                      className={`w-8 text-center font-bold text-lg ${rankColor}`}
                    >
                      {RankIcon ? (
                        <RankIcon className="w-6 h-6 mx-auto" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <Avatar
                      className={`border-2 ${isMe ? "border-primary" : "border-transparent"}`}
                    >
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.name ? member.name.charAt(0) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span
                        className={`font-semibold ${isMe ? "text-primary" : "text-foreground"}`}
                      >
                        {member.name || "Anonymous User"} {isMe && "(You)"}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {member.streakDays > 0 && (
                          <span className="flex items-center gap-0.5 text-orange-500">
                            <Flame className="w-3 h-3 fill-orange-500" />
                            {member.streakDays}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 sm:gap-8 justify-end w-1/2 sm:w-auto text-right font-mono text-sm">
                    <div className="w-16 flex items-center justify-end">
                      <span className="bg-muted px-2 py-1 rounded-md text-foreground font-bold">
                        Lv {member.level || 1}
                      </span>
                    </div>
                    <div className="w-16 flex items-center justify-end text-primary font-bold">
                      {member.xp || 0}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
