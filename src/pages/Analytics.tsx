import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Activity, Flame, Lock, PieChart as PieChartIcon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../AuthContext";
import { PageHeader } from "../components/ui/page-header.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { PageLoader } from "../components/ui/skeleton.tsx";
import { useNavigate } from "react-router";

const MACRO_COLORS = ["hsl(var(--primary))", "#f97316", "#eab308"];

export default function Analytics() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ food: [], exercise: [] });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ownsProAnalytics, setOwnsProAnalytics] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.food && json.exercise) {
          setData(json);
          processChartData(json.food, json.exercise);
        }

        const storeRes = await fetch("/api/store", { headers: { Authorization: `Bearer ${token}` } });
        const storeData = await storeRes.json();
        const proItem = storeData.items?.find((i: any) => i.id === "pro_analytics");
        setOwnsProAnalytics(!!proItem?.owned);
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    };
    fetchAnalytics();
  }, [getToken]);

  const macroTotals = (data.food as any[]).reduce(
    (acc, f) => {
      acc.protein += f.protein || 0;
      acc.carbs += f.carbs || 0;
      acc.fats += f.fats || 0;
      return acc;
    },
    { protein: 0, carbs: 0, fats: 0 },
  );
  const macroData = [
    { name: "Protein", value: macroTotals.protein },
    { name: "Carbs", value: macroTotals.carbs },
    { name: "Fats", value: macroTotals.fats },
  ];
  const hasMacroData = macroTotals.protein + macroTotals.carbs + macroTotals.fats > 0;

  const processChartData = (foods: any[], exercises: any[]) => {
    // Generate last 7 days including today
    const map = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString([], { weekday: "short" });
      map.set(d.toISOString().split("T")[0], {
        name: dateStr,
        caloriesIn: 0,
        caloriesOut: 0,
      });
    }

    foods.forEach((f) => {
      const key = new Date(f.createdAt).toISOString().split("T")[0];
      if (map.has(key)) {
        const entry = map.get(key);
        entry.caloriesIn += f.calories || 0;
        map.set(key, entry);
      }
    });

    exercises.forEach((e) => {
      const key = new Date(e.createdAt).toISOString().split("T")[0];
      if (map.has(key)) {
        const entry = map.get(key);
        entry.caloriesOut += e.caloriesBurned || 0;
        map.set(key, entry);
      }
    });

    setChartData(Array.from(map.values()));
  };

  if (!loaded) return <PageLoader rows={2} />;

  const hasData = data.food.length > 0 || data.exercise.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-6xl mx-auto"
    >
      <PageHeader
        icon={TrendingUp}
        title="Analytics & Trends"
        description="Visualize your progress over the last 7 days."
      />

      {!hasData ? (
        <EmptyState icon={TrendingUp} title="Nothing to chart yet" description="Log a few meals and workouts on Smart Track to see your calorie trends here." />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-bold mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Calories In vs Out
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#333"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="caloriesIn"
                    name="In (Consumed)"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="caloriesOut"
                    name="Out (Burned)"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-bold mb-2">
              <Activity className="w-5 h-5 text-secondary" />
              Net Caloric Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData.map((d) => ({
                    ...d,
                    net: d.caloriesIn - d.caloriesOut,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#333"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Balance"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(var(--secondary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      )}

      <Card className="border-border relative overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 font-bold mb-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            Macro Breakdown
          </CardTitle>
          <CardDescription>Protein / carbs / fats split across your logged meals.</CardDescription>
        </CardHeader>
        <CardContent className={ownsProAnalytics ? "h-72" : "h-56"}>
          {!ownsProAnalytics ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Lock className="w-5.5 h-5.5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground mb-1">Pro Analytics</h4>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Unlock the macro breakdown chart in the Community Rewards Store for 1000 coins.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate("/community")}>
                Open Rewards Store
              </Button>
            </div>
          ) : !hasMacroData ? (
            <EmptyState icon={PieChartIcon} title="Nothing to chart yet" description="Log a few meals with a Pro Analytics unlock to see your macro split here." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={macroData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {macroData.map((entry, i) => (
                    <Cell key={entry.name} fill={MACRO_COLORS[i]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
