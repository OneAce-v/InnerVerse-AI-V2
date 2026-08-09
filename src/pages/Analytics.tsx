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
import { TrendingUp, Activity, Flame } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { useAuth } from "../AuthContext";

export default function Analytics() {
  const { getToken } = useAuth();
  const [data, setData] = useState({ food: [], exercise: [] });
  const [chartData, setChartData] = useState<any[]>([]);

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
      } catch (e) {
        console.error(e);
      }
    };
    fetchAnalytics();
  }, [getToken]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-6xl mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Analytics & Trends
          </h1>
          <p className="text-muted-foreground text-sm">
            Visualize your progress over the last 7 days.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-bold mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Calories In vs Out
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length > 0 ? (
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
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            )}
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
            {chartData.length > 0 ? (
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
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
